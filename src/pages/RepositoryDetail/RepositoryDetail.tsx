import React, { useState, useEffect } from 'react';
    import { useParams, useNavigate } from 'react-router-dom';
    import { FolderPlus, Upload, Trash2, Download, RefreshCw, File as FileIcon, Folder as FolderIcon, ArrowLeft } from 'lucide-react';
    import Card from '../../components/Card'; // Adjusted import path
    import Button from '../../components/Button'; // Adjusted import path
    import Modal from '../../components/Modal'; // Adjusted import path
    import FileUploader from '../../components/FileUploader'; // Adjusted import path
    import EmptyState from '../../components/EmptyState'; // Adjusted import path
    import Spinner from '../../components/Spinner'; // Adjusted import path
    import { listRepositoryFiles, createFolder, deleteFolder, deleteFile, downloadFile, processFile, processDirectory } from '../../api'; // Adjusted import path
    import { FileInfo } from '../../types'; // Adjusted import path
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
      const [isProcessing, setIsProcessing] = useState(false);
      const [isProcessingDirectory, setIsProcessingDirectory] = useState(false);
      const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

      useEffect(() => {
        setCurrentPath(path || '');
      }, [path]);

      useEffect(() => {
        if (repositoryName) {
          fetchFiles();
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [repositoryName, currentPath]);

      const fetchFiles = async (refresh = false) => {
        if (!repositoryName) return;

        if (refresh) {
          setIsRefreshing(true);
        } else {
          setLoading(true);
        }
        try {
          const data = await listRepositoryFiles(repositoryName, currentPath);
          setFiles(data);
        } catch (error) {
          console.error("Error fetching files:", error);
          toast.error('Failed to fetch files');
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
          fetchFiles(true);
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
          }
          setIsDeleteModalOpen(false);
          setSelectedItem(null);
          fetchFiles(true);
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

      const handleProcessFiles = async () => {
        if (!repositoryName || uploadedFiles.length === 0) return;

        setIsProcessing(true);
        let successCount = 0;
        const totalFiles = uploadedFiles.length;
        const toastId = toast.loading(`Processing 0/${totalFiles} files...`);

        try {
          for (const [index, file] of uploadedFiles.entries()) {
            try {
              await processFile(repositoryName, file, currentPath);
              successCount++;
              toast.loading(`Processing ${successCount}/${totalFiles} files...`, { id: toastId });
            } catch (fileError) {
               console.error(`Error processing file ${file.name}:`, fileError);
               toast.error(`Failed to process ${file.name}`, { duration: 2000 });
            }
          }

          if (successCount > 0) {
             toast.success(`${successCount}/${totalFiles} files processed successfully`, { id: toastId });
          } else {
             toast.error('No files were processed successfully', { id: toastId });
          }

          setIsUploadModalOpen(false);
          setUploadedFiles([]);
          fetchFiles(true);
        } catch (error) {
          console.error("Error processing files:", error);
          toast.error('An unexpected error occurred during processing', { id: toastId });
        } finally {
          setIsProcessing(false);
        }
      };

      const handleProcessDirectory = async () => {
        if (!repositoryName) return;

        setIsProcessingDirectory(true);
        const toastId = toast.loading(`Starting processing for directory: ${currentPath || 'root'}...`);
        try {
          await processDirectory(repositoryName, currentPath);
          toast.success(`Directory processing started for: ${currentPath || 'root'}`, { id: toastId });
          setIsProcessingModalOpen(false);
        } catch (error) {
          console.error("Error processing directory:", error);
          toast.error(`Failed to start processing directory: ${currentPath || 'root'}`, { id: toastId });
        } finally {
          setIsProcessingDirectory(false);
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

        if (newPath) {
          navigate(`/repositories/${repositoryName}/${newPath}`);
        } else {
          navigate(`/repositories/${repositoryName}`);
        }
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
              <Button
                onClick={() => fetchFiles(true)}
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
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Type
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
                      <tr key={file.path} className="hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {file.is_directory ? (
                              <FolderIcon className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0" />
                            ) : (
                              <FileIcon className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0" />
                            )}
                            <div className="text-sm font-medium text-white">
                              {file.is_directory ? (
                                <button
                                  onClick={() => navigateToFolder(file.path)}
                                  className="hover:text-blue-400 text-left"
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
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleProcessFiles}
                  isLoading={isProcessing}
                  disabled={uploadedFiles.length === 0}
                >
                  Process Files
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Upload files to be processed and added to the repository. Supported file types include PDF, TXT, and DOCX.
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
                This will process all supported files in the current directory (<span className="font-semibold text-white">{currentPath || 'root'}</span>) and add them to the vector database for searching. This operation may take some time depending on the number and size of files.
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
