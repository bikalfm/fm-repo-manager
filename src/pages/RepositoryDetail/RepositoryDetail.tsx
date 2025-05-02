import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FolderPlus, Upload, Trash2, Download, RefreshCw, File as FileIcon, Folder as FolderIcon, ArrowLeft, CheckCircle, Play, Square, CheckSquare } from 'lucide-react'; // Added Play, Square, CheckSquare icons
import Card from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import FileUploader from '../../components/FileUploader';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import { listRepositoryFiles, createFolder, deleteFolder, deleteFile, downloadFile, processDirectory, getProcessedFilenames, processFilesByPath } from '../../api'; // Updated API import
import { FileInfo } from '../../types';
import toast from 'react-hot-toast';

const RepositoryDetail: React.FC = () => {
  const { repositoryName, '*': path } = useParams<{ repositoryName: string; '*': string }>();
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPath, setCurrentPath] = useState(path || '');
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedItem, setSelectedItem] = useState<FileInfo | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false); // For upload modal processing
  const [isProcessingDirectory, setIsProcessingDirectory] = useState(false);
  const [isProcessingSelected, setIsProcessingSelected] = useState(false); // For selected files processing
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(new Set()); // State for selected file paths

  useEffect(() => {
    setCurrentPath(path || '');
    setSelectedFilePaths(new Set()); // Reset selection on path change
  }, [path]);

  useEffect(() => {
    if (repositoryName) {
      fetchFilesAndStatus();
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repositoryName, currentPath]);

  const fetchFilesAndStatus = async (refresh = false) => {
    if (!repositoryName) return;

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      console.log(`Fetching data for repo: ${repositoryName}, path: '${currentPath}'`);
      const [filesData, processedNamesData] = await Promise.all([
        listRepositoryFiles(repositoryName, currentPath),
        getProcessedFilenames(repositoryName)
      ]);

      console.log('Received filesData:', filesData);
      console.log('Received processedNamesData:', processedNamesData);

      const processedSet = new Set(processedNamesData);
      console.log('Created processedSet:', processedSet);

      const filesWithStatus = filesData.map(file => ({
        ...file,
        isProcessed: !file.is_directory && processedSet.has(file.path)
      }));

      console.log('Mapped filesWithStatus:', filesWithStatus);
      setFiles(filesWithStatus);
      // Don't reset selection on refresh, only on path change
      // setSelectedFilePaths(new Set());

    } catch (error) {
      console.error("Error fetching files or status:", error);
      toast.error('Failed to fetch repository data. Check console for details.');
    } finally {
       if (refresh) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleCreateFolder = async () => {
    if (!repositoryName || !newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      const folderPath = currentPath
        ? `${currentPath}/${newFolderName.trim()}`
        : newFolderName.trim();

      await createFolder(repositoryName, folderPath);
      toast.success(`Folder "${newFolderName}" created successfully`);
      setIsCreateFolderModalOpen(false);
      setNewFolderName('');
      fetchFilesAndStatus(true); // Refresh data
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error('Failed to create folder');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!repositoryName || !selectedItem) return;

    setIsDeleting(true);
    try {
      if (selectedItem.is_directory) {
        await deleteFolder(repositoryName, selectedItem.path);
        toast.success(`Folder "${selectedItem.name}" deleted successfully`);
      } else {
        await deleteFile(repositoryName, selectedItem.path);
        toast.success(`File "${selectedItem.name}" deleted successfully`);
        // Remove from selection if deleted
        setSelectedFilePaths(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedItem.path);
          return newSet;
        });
      }
      setIsDeleteModalOpen(false);
      setSelectedItem(null);
      fetchFilesAndStatus(true); // Refresh data
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error(`Failed to delete ${selectedItem.is_directory ? 'folder' : 'file'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileUpload = (files: File[]) => {
    setUploadedFiles(files);
  };

  // This function is now only for handling the upload modal's "Process Files" button
  // It uses the old processFile endpoint which uploads AND processes
  const handleProcessUploadedFiles = async () => {
    if (!repositoryName || uploadedFiles.length === 0) return;

    setIsProcessingUpload(true);
    let successCount = 0;
    const totalFiles = uploadedFiles.length;
    const toastId = toast.loading(`Processing 0/${totalFiles} uploaded files...`);

    try {
      // Note: This still uses the old endpoint that takes FormData
      // If the backend supports processing uploaded files via the new endpoint, this needs adjustment.
      for (const [index, file] of uploadedFiles.entries()) {
        try {
          // Assuming processFile uploads and processes
          await processFile(repositoryName, file, currentPath);
          successCount++;
          toast.loading(`Processing ${successCount}/${totalFiles} uploaded files...`, { id: toastId });
        } catch (fileError) {
           console.error(`Error processing uploaded file ${file.name}:`, fileError);
           toast.error(`Failed to process ${file.name}`, { duration: 2000 });
        }
      }

      if (successCount > 0) {
         toast.success(`${successCount}/${totalFiles} files uploaded and processed successfully`, { id: toastId });
      } else {
         toast.error('No files were processed successfully', { id: toastId });
      }

      setIsUploadModalOpen(false);
      setUploadedFiles([]);
      fetchFilesAndStatus(true); // Refresh data after processing
    } catch (error) {
      console.error("Error processing uploaded files:", error);
      toast.error('An unexpected error occurred during upload processing', { id: toastId });
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const handleProcessDirectory = async () => {
    if (!repositoryName) return;

    setIsProcessingDirectory(true);
    const toastId = toast.loading(`Starting processing for directory: ${currentPath || 'root'}...`);
    try {
      await processDirectory(repositoryName, currentPath);
      toast.success(`Directory processing started for: ${currentPath || 'root'}. Refresh to see status updates.`, { id: toastId, duration: 5000 });
      setIsProcessingModalOpen(false);
      setTimeout(() => fetchFilesAndStatus(true), 5000);
    } catch (error) {
      console.error("Error processing directory:", error);
      toast.error(`Failed to start processing directory: ${currentPath || 'root'}`, { id: toastId });
    } finally {
      setIsProcessingDirectory(false);
    }
  };

  // New function to process selected files using the new endpoint
  const handleProcessSelectedFiles = async () => {
    if (!repositoryName || selectedFilePaths.size === 0) return;

    setIsProcessingSelected(true);
    const pathsToProcess = Array.from(selectedFilePaths);
    const toastId = toast.loading(`Processing ${pathsToProcess.length} selected file(s)...`);

    try {
      await processFilesByPath(repositoryName, pathsToProcess);
      toast.success(`${pathsToProcess.length} file(s) sent for processing successfully. Refresh to see status updates.`, { id: toastId, duration: 5000 });
      setSelectedFilePaths(new Set()); // Clear selection after successful processing
      // Optionally trigger a delayed refresh
      setTimeout(() => fetchFilesAndStatus(true), 5000);
    } catch (error) {
      console.error("Error processing selected files:", error);
      toast.error(`Failed to process selected files.`, { id: toastId });
    } finally {
      setIsProcessingSelected(false);
    }
  };

  const toggleFileSelection = (filePath: string) => {
    setSelectedFilePaths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return newSet;
    });
  };

  const toggleSelectAllFiles = () => {
    const allFilePathsInView = files.filter(f => !f.is_directory).map(f => f.path);
    if (selectedFilePaths.size === allFilePathsInView.length) {
      // Deselect all
      setSelectedFilePaths(new Set());
    } else {
      // Select all
      setSelectedFilePaths(new Set(allFilePathsInView));
    }
  };

  const navigateToFolder = (folderPath: string) => {
    navigate(`/repositories/${repositoryName}/${folderPath}`);
  };

  const navigateUp = () => {
    if (!currentPath) return;
    const pathParts = currentPath.split('/');
    pathParts.pop();
    const newPath = pathParts.join('/');
    navigate(`/repositories/${repositoryName}${newPath ? `/${newPath}` : ''}`);
  };

  const handleDownload = (file: FileInfo) => {
    if (!repositoryName) return;
    window.open(downloadFile(repositoryName, file.path), '_blank');
  };

  const openDeleteModal = (item: FileInfo) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  const renderBreadcrumbs = () => {
    const pathParts = currentPath ? currentPath.split('/') : [];
    return (
      <div className="flex items-center text-sm flex-wrap">
        <button
          onClick={() => navigate(`/repositories/${repositoryName}`)}
          className="text-white hover:text-gray-300 font-medium"
        >
          {repositoryName}
        </button>
        {pathParts.map((part, index) => {
          const currentCrumbPath = pathParts.slice(0, index + 1).join('/');
          return (
            <React.Fragment key={index}>
              <span className="mx-2 text-gray-500">/</span>
              {index === pathParts.length - 1 ? (
                <span className="font-medium text-gray-400">{part}</span>
              ) : (
                <button
                  onClick={() => navigateToFolder(currentCrumbPath)}
                  className="text-white hover:text-gray-300"
                >
                  {part}
                </button>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const allFilesSelected = useMemo(() => {
    const filesInView = files.filter(f => !f.is_directory);
    return filesInView.length > 0 && selectedFilePaths.size === filesInView.length;
  }, [files, selectedFilePaths]);

  const someFilesSelected = useMemo(() => {
     const filesInView = files.filter(f => !f.is_directory);
     return selectedFilePaths.size > 0 && selectedFilePaths.size < filesInView.length;
  }, [files, selectedFilePaths]);

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-white sm:text-3xl sm:truncate mb-2">
            Repository: {repositoryName}
          </h2>
          <div className="mt-1">
            {renderBreadcrumbs()}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 md:mt-0 md:ml-4">
           {/* Process Selected Button */}
           <Button
            onClick={handleProcessSelectedFiles}
            variant="primary" // Make it stand out
            icon={<Play className="h-4 w-4" />}
            isLoading={isProcessingSelected}
            disabled={selectedFilePaths.size === 0 || isProcessingSelected}
          >
            Process Selected ({selectedFilePaths.size})
          </Button>
          <Button
            onClick={() => fetchFilesAndStatus(true)}
            variant="secondary"
            icon={<RefreshCw className="h-4 w-4" />}
            isLoading={isRefreshing}
          >
            Refresh
          </Button>
          <Button
            onClick={() => setIsCreateFolderModalOpen(true)}
            variant="secondary"
            icon={<FolderPlus className="h-4 w-4" />}
          >
            New Folder
          </Button>
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            variant="secondary"
            icon={<Upload className="h-4 w-4" />}
          >
            Upload Files
          </Button>
          <Button
            onClick={() => setIsProcessingModalOpen(true)}
            isLoading={isProcessingDirectory}
          >
            Process Directory
          </Button>
        </div>
      </div>

      {currentPath && (
        <div className="mb-4">
          <Button
            onClick={navigateUp}
            variant="outline"
            size="sm"
            icon={<ArrowLeft className="h-4 w-4" />}
          >
             Up
          </Button>
        </div>
      )}

      {loading ? (
         <Spinner className="py-12" />
      ) : files.length === 0 ? (
        <EmptyState
          title="Folder is empty"
          description="Upload files or create folders to get started."
          icon={<Upload className="h-8 w-8" />}
          actionText="Upload Files"
          onAction={() => setIsUploadModalOpen(true)}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-10"> {/* Checkbox column */}
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-600 text-white bg-gray-700 focus:ring-white focus:ring-offset-gray-800 cursor-pointer"
                        checked={allFilesSelected}
                        ref={input => { // Indeterminate state handling
                          if (input) {
                            input.indeterminate = someFilesSelected;
                          }
                        }}
                        onChange={toggleSelectAllFiles}
                        disabled={files.filter(f => !f.is_directory).length === 0} // Disable if no files
                      />
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                   <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Size
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Modified
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-900 divide-y divide-gray-700">
                {files.map((file) => (
                  <tr key={file.path} className={`hover:bg-gray-800 ${selectedFilePaths.has(file.path) ? 'bg-gray-800/50' : ''}`}>
                     <td className="px-4 py-4 whitespace-nowrap"> {/* Checkbox cell */}
                      {!file.is_directory && (
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-600 text-white bg-gray-700 focus:ring-white focus:ring-offset-gray-900 cursor-pointer"
                            checked={selectedFilePaths.has(file.path)}
                            onChange={() => toggleFileSelection(file.path)}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap max-w-xs">
                      <div className="flex items-center">
                        {file.is_directory ? (
                          <FolderIcon className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0" />
                        ) : (
                          <FileIcon className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0" />
                        )}
                        <div className="text-sm font-medium text-white truncate" title={file.name}>
                          {file.is_directory ? (
                            <button
                              onClick={() => navigateToFolder(file.path)}
                              className="hover:text-blue-400 text-left truncate"
                              title={file.name}
                            >
                              {file.name}
                            </button>
                          ) : (
                            file.name
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">
                        {file.is_directory ? 'Folder' : (file.content_type || 'File')}
                      </div>
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-400 flex items-center justify-center">
                        {file.is_directory ? (
                          '-'
                        ) : file.isProcessed ? (
                          <CheckCircle className="h-5 w-5 text-green-500" title="Processed" />
                        ) : (
                           <span className="text-gray-500" title="Not Processed">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">
                        {file.is_directory ? '-' : formatFileSize(file.size)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">
                        {new Date(file.modified_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                         {/* Removed individual Process button */}
                        {!file.is_directory && (
                          <Button
                            onClick={() => handleDownload(file)}
                            variant="outline"
                            size="sm"
                            icon={<Download className="h-4 w-4" />}
                          >
                            Download
                          </Button>
                        )}
                        <Button
                          onClick={() => openDeleteModal(file)}
                          variant="danger"
                          size="sm"
                          icon={<Trash2 className="h-4 w-4" />}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Folder Modal */}
      <Modal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        title="Create New Folder"
        size="sm"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setIsCreateFolderModalOpen(false)}
              disabled={isCreatingFolder}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              isLoading={isCreatingFolder}
            >
              Create
            </Button>
          </div>
        }
      >
        <div>
          <label htmlFor="folder-name" className="block text-sm font-medium text-white">
            Folder Name
          </label>
          <input
            type="text"
            id="folder-name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="mt-1 block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm"
            placeholder="New Folder"
          />
        </div>
      </Modal>

      {/* Upload Files Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload and Process Files"
        size="lg"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setIsUploadModalOpen(false)}
              disabled={isProcessingUpload}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProcessUploadedFiles} // Use the specific handler for upload modal
              isLoading={isProcessingUpload}
              disabled={uploadedFiles.length === 0}
            >
              Upload & Process
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Upload files to be processed and added to the repository. Supported file types include PDF, TXT, and DOCX. Files will be uploaded to the current directory (<span className="font-semibold text-white">{currentPath || 'root'}</span>) and then processed.
          </p>

          <FileUploader
            onFilesSelected={handleFileUpload}
            multiple={true}
            accept={{
              'application/pdf': ['.pdf'],
              'text/plain': ['.txt'],
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
            }}
          />

          {uploadedFiles.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-white mb-2">Selected Files:</h4>
              <ul className="text-sm text-gray-400 space-y-1 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent pr-2">
                {uploadedFiles.map((file, index) => (
                  <li key={index} className="flex items-center">
                    <FileIcon className="h-4 w-4 mr-2 text-blue-400 flex-shrink-0" />
                    <span className="truncate">{file.name} ({formatFileSize(file.size)})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Modal>

      {/* Process Directory Modal */}
      <Modal
        isOpen={isProcessingModalOpen}
        onClose={() => setIsProcessingModalOpen(false)}
        title="Process Directory"
        size="md"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setIsProcessingModalOpen(false)}
              disabled={isProcessingDirectory}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProcessDirectory}
              isLoading={isProcessingDirectory}
            >
              Process
            </Button>
          </div>
        }
      >
        <div>
          <p className="text-sm text-gray-400">
            This will process all supported files in the current directory (<span className="font-semibold text-white">{currentPath || 'root'}</span>) and add them to the vector database for searching. This operation may take some time depending on the number and size of files. Already processed files might be skipped or updated based on backend logic.
          </p>
          <div className="mt-4 p-3 bg-yellow-900/30 rounded-md border border-yellow-700">
            <p className="text-sm text-yellow-300">
              <strong>Note:</strong> Only PDF, TXT, and DOCX files will be processed. Other file types will be skipped.
            </p>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={`Delete ${selectedItem?.is_directory ? 'Folder' : 'File'}`}
        size="sm"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteItem}
              isLoading={isDeleting}
            >
              Delete
            </Button>
          </div>
        }
      >
        <div>
          <p className="text-sm text-gray-400">
            Are you sure you want to delete {selectedItem?.is_directory ? 'folder' : 'file'} <span className="font-semibold text-white">{selectedItem?.name}</span>? This action cannot be undone.

            {selectedItem?.is_directory && (
              <span className="block mt-2 text-red-500">
                Warning: This will delete all files and subfolders within this folder.
              </span>
            )}
             {!selectedItem?.is_directory && selectedItem?.isProcessed && (
              <span className="block mt-2 text-yellow-500">
                Note: This file has been processed. Deleting it here only removes it from the repository view, not necessarily from the vector database unless the backend handles this cleanup.
              </span>
            )}
          </p>
        </div>
      </Modal>
    </div>
  );
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default RepositoryDetail;
