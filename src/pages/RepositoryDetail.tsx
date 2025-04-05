import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FolderPlus, Upload, Trash2, Download, RefreshCw, File as FileIcon, Folder, ArrowLeft, Database } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
// Rename the imported component to avoid conflict
import DropzoneUploader from '../components/FileUploader';
import EmptyState from '../components/EmptyState';
import { listRepositoryFiles, createFolder, deleteFolder, deleteFile, downloadFile, processFile, processDirectory } from '../api';
import { FileInfo } from '../types';
import toast from 'react-hot-toast';
import axios from 'axios'; // Import axios for error checking

const RepositoryDetail: React.FC = () => {
  // Use '*' for the path parameter to capture everything after repositoryName
  const { repositoryName, '*': path } = useParams<{ repositoryName: string; '*': string }>();
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState(path || '');
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedItem, setSelectedItem] = useState<FileInfo | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // For batch file processing
  const [isProcessingDirectory, setIsProcessingDirectory] = useState(false); // Specific for directory processing
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Update currentPath state when the URL parameter changes
    setCurrentPath(path || '');
  }, [path]);

  useEffect(() => {
    if (repositoryName) {
      fetchFiles();
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repositoryName, currentPath]); // Depend on currentPath state

  const fetchFiles = async () => {
    if (!repositoryName) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await listRepositoryFiles(repositoryName, currentPath);
      // Sort folders first, then files, alphabetically
      setFiles(data.sort((a, b) => {
        if (a.is_directory !== b.is_directory) {
          return a.is_directory ? -1 : 1; // Directories first
        }
        return a.name.localeCompare(b.name); // Then sort by name
      }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch files/folders for path: "${currentPath || '/'}". ${errorMsg}`);
      toast.error(`Failed to fetch files: ${errorMsg}`);
      console.error("Error fetching files:", err);
      setFiles([]); // Clear files on error
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    const trimmedName = newFolderName.trim();
    if (!repositoryName || !trimmedName) return;

    // Basic validation for folder name (avoid slashes)
    if (trimmedName.includes('/') || trimmedName.includes('\\')) {
      toast.error('Folder name cannot contain slashes.');
      return;
    }
    if (files.some(f => f.name === trimmedName && f.is_directory)) {
       toast.error(`Folder "${trimmedName}" already exists.`);
       return;
    }
    
    setIsCreatingFolder(true);
    const toastId = toast.loading(`Creating folder "${trimmedName}"...`);
    try {
      const folderPath = currentPath 
        ? `${currentPath}/${trimmedName}`
        : trimmedName;
        
      await createFolder(repositoryName, folderPath);
      toast.success(`Folder "${trimmedName}" created successfully`, { id: toastId });
      setIsCreateFolderModalOpen(false);
      setNewFolderName('');
      fetchFiles(); // Refresh list
    } catch (error) {
      toast.error(`Failed to create folder: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
      console.error("Error creating folder:", error);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!repositoryName || !selectedItem) return;
    
    setIsDeleting(true);
    const itemType = selectedItem.is_directory ? 'folder' : 'file';
    const toastId = toast.loading(`Deleting ${itemType} "${selectedItem.name}"...`);
    try {
      if (selectedItem.is_directory) {
        await deleteFolder(repositoryName, selectedItem.path);
      } else {
        await deleteFile(repositoryName, selectedItem.path);
      }
      toast.success(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} "${selectedItem.name}" deleted successfully`, { id: toastId });
      setIsDeleteModalOpen(false);
      setSelectedItem(null);
      fetchFiles(); // Refresh list
    } catch (error) {
      toast.error(`Failed to delete ${itemType}: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
      console.error(`Error deleting ${itemType}:`, error);
    } finally {
      setIsDeleting(false);
    }
  };

  // This function is called by the local FileUploader trigger component
  const handleFileUploadTrigger = (acceptedFiles: File[]) => {
    setUploadedFiles(acceptedFiles);
    if (acceptedFiles.length > 0) {
      setIsUploadModalOpen(true); // Open the modal to confirm processing
    }
  };

  // This function is called when the "Process" button in the Upload Modal is clicked
  const handleProcessFiles = async () => {
    if (!repositoryName || uploadedFiles.length === 0) return;
    
    setIsProcessing(true); // Use the correct state variable
    const toastId = toast.loading(`Processing ${uploadedFiles.length} file(s)...`);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Process files sequentially
      for (const file of uploadedFiles) {
        try {
          await processFile(repositoryName, file, currentPath);
          successCount++;
          // Optional: More granular success toast
          // toast.success(`Processed "${file.name}"`, { duration: 2000 });
        } catch (fileError) {
          errorCount++;
          const errorMsg = fileError instanceof Error ? fileError.message : 'Unknown error';
          console.error(`Error processing file "${file.name}":`, fileError);
          toast.error(`Failed to process "${file.name}": ${errorMsg}`, { duration: 4000 });
        }
      }

      if (errorCount > 0 && successCount > 0) {
        toast.error(`Processed ${successCount} files with ${errorCount} errors.`, { id: toastId, duration: 5000 });
      } else if (errorCount > 0 && successCount === 0) {
        toast.error(`Failed to process all ${errorCount} files.`, { id: toastId, duration: 5000 });
      } else {
        toast.success(`Successfully processed ${successCount} file(s).`, { id: toastId });
      }

      setIsUploadModalOpen(false);
      setUploadedFiles([]);
      fetchFiles(); // Refresh list after processing
    } catch (error) {
      // Catch potential errors in the loop setup itself
      toast.error('An unexpected error occurred during batch processing.', { id: toastId });
      console.error("Error processing files batch:", error);
    } finally {
      setIsProcessing(false); // Use the correct state variable
    }
  };

  const handleProcessDirectory = async () => {
    if (!repositoryName) return;
    
    setIsProcessingDirectory(true); // Use specific state
    const toastId = toast.loading(`Starting processing for directory "${currentPath || '/'}"...`);
    try {
      const result = await processDirectory(repositoryName, currentPath);
      // Provide more informative feedback based on API response if possible
      toast.success(`Directory processing started. Files found: ${result.files_processed ?? 'N/A'}. Check API logs for progress.`, { id: toastId, duration: 6000 });
      setIsProcessingModalOpen(false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to start directory processing: ${errorMsg}`, { id: toastId });
      console.error("Error processing directory:", error);
    } finally {
      setIsProcessingDirectory(false); // Use specific state
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
    try {
      const url = downloadFile(repositoryName, file.path);
      window.open(url, '_blank');
    } catch (error) {
      toast.error(`Failed to initiate download for ${file.name}`);
      console.error("Download error:", error);
    }
  };

  const openDeleteModal = (item: FileInfo) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  const renderBreadcrumbs = () => {
    const pathParts = currentPath.split('/').filter(part => part !== '');

    return (
      <nav className="flex items-center text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2 overflow-x-auto whitespace-nowrap scrollbar-thin py-1">
          <li>
            <Link
              to={`/repositories/${repositoryName}`}
              className="text-gray-400 hover:text-white flex items-center"
              title={`Back to ${repositoryName} root`}
            >
              <Database className="h-4 w-4 mr-1 flex-shrink-0" />
              {repositoryName}
            </Link>
          </li>
          
          {pathParts.map((part, index) => {
            const pathToPart = pathParts.slice(0, index + 1).join('/');
            const isLast = index === pathParts.length - 1;
            return (
              <li key={index}>
                <div className="flex items-center">
                  <span className="mx-2 text-gray-500">/</span>
                  {isLast ? (
                    <span className="font-semibold text-white truncate max-w-[200px]" title={part} aria-current="page">
                      {part}
                    </span>
                  ) : (
                    <Link
                      to={`/repositories/${repositoryName}/${pathToPart}`}
                      className="text-gray-400 hover:text-white truncate max-w-[200px]"
                      title={part}
                    >
                      {part}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between mb-4">
        <div className="flex-1 min-w-0 mb-4 md:mb-0">
          {renderBreadcrumbs()}
        </div>
        <div className="flex flex-wrap gap-2 md:ml-4">
          <Button
            onClick={fetchFiles}
            variant="secondary"
            icon={<RefreshCw className="h-4 w-4" />}
            disabled={loading}
            isLoading={loading}
            title="Refresh file list"
          >
            Refresh
          </Button>
          <Button
            onClick={() => setIsCreateFolderModalOpen(true)}
            variant="secondary"
            icon={<FolderPlus className="h-4 w-4" />}
            title="Create a new folder here"
            disabled={loading}
          >
            New Folder
          </Button>
          {/* Use the local FileUploader component which acts as a trigger */}
          <FileUploader
            onFilesSelected={handleFileUploadTrigger} // Use the trigger handler
            multiple={true}
            accept={{
              'application/pdf': ['.pdf'],
              'text/plain': ['.txt'],
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
            }}
            className="inline-block"
            label="Upload Files"
          >
            {/* Pass the actual Button as children */}
            <Button
              variant="secondary"
              icon={<Upload className="h-4 w-4" />}
              title="Upload files to this folder"
              disabled={loading}
            >
              Upload Files
            </Button>
          </FileUploader>
          <Button
            onClick={() => setIsProcessingModalOpen(true)}
            disabled={loading || isProcessingDirectory} // Disable based on directory processing state
            isLoading={isProcessingDirectory}
            title={`Process all supported files in "${currentPath || '/'}"`}
          >
            Process Directory
          </Button>
        </div>
      </div>

      {/* Back Button */}
      {currentPath && (
        <div className="mb-4">
          <Button
            onClick={navigateUp}
            variant="outline"
            size="sm"
            icon={<ArrowLeft className="h-4 w-4" />}
            title="Go to parent directory"
            disabled={loading}
          >
            Up one level
          </Button>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      ) : error ? (
         <Card>
           <p className="text-center text-red-400">{error}</p>
           <div className="mt-4 text-center">
             <Button onClick={fetchFiles}>Retry</Button>
           </div>
         </Card>
      ) : files.length === 0 ? (
        <EmptyState
          title="Folder is empty"
          description="Upload files or create folders to get started."
          icon={<Folder className="h-12 w-12" />}
          actionText="Upload Files"
          // Trigger the hidden input associated with the local FileUploader
          onAction={() => document.getElementById('local-file-uploader-input')?.click()}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto table-responsive">
            <table className="min-w-full divide-y divide-gray-700 table-zebra">
              <thead className="bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Size
                  </th>
                  <th scope="col" className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Modified
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {files.map((file) => (
                  <tr key={file.path}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {file.is_directory ? (
                          <Folder className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0" />
                        ) : (
                          <FileIcon className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0" />
                        )}
                        <div className="text-sm font-medium text-white">
                          {file.is_directory ? (
                            <button
                              onClick={() => navigateToFolder(file.path)}
                              className="hover:text-blue-400 text-left truncate max-w-[200px] sm:max-w-xs"
                              title={`Open folder ${file.name}`}
                            >
                              {file.name}
                            </button>
                          ) : (
                            <span className="truncate max-w-[200px] sm:max-w-xs" title={file.name}>{file.name}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">
                        {file.is_directory ? 'Folder' : (file.content_type || 'File')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">
                        {file.is_directory ? '-' : formatFileSize(file.size)}
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">
                        {new Date(file.modified_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center space-x-2">
                        {!file.is_directory && (
                          <Button
                            onClick={() => handleDownload(file)}
                            variant="outline"
                            size="sm"
                            icon={<Download className="h-4 w-4" />}
                            title={`Download ${file.name}`}
                          >
                            <span className="hidden sm:inline">Download</span>
                          </Button>
                        )}
                        <Button
                          onClick={() => openDeleteModal(file)}
                          variant="danger"
                          size="sm"
                          icon={<Trash2 className="h-4 w-4" />}
                          title={`Delete ${file.is_directory ? 'folder' : 'file'} ${file.name}`}
                        >
                           <span className="hidden sm:inline">Delete</span>
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
              disabled={!newFolderName.trim() || isCreatingFolder || newFolderName.includes('/') || newFolderName.includes('\\')}
            >
              {isCreatingFolder ? 'Creating...' : 'Create'}
            </Button>
          </div>
        }
      >
        <div>
          <label htmlFor="folder-name" className="block text-sm font-medium text-white mb-1">
            Folder Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="folder-name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm disabled:opacity-50"
            placeholder="New Folder Name"
            required
            disabled={isCreatingFolder}
          />
           <p className="mt-1 text-xs text-gray-400">
              Folder name cannot contain slashes (/ or \).
            </p>
        </div>
      </Modal>

      {/* Upload Files Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => { setIsUploadModalOpen(false); setUploadedFiles([]); }}
        title="Upload and Process Files"
        size="lg"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => { setIsUploadModalOpen(false); setUploadedFiles([]); }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProcessFiles}
              isLoading={isProcessing}
              disabled={uploadedFiles.length === 0 || isProcessing}
            >
              {isProcessing ? `Processing ${uploadedFiles.length}...` : `Process ${uploadedFiles.length} File(s)`}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            The following files will be uploaded to <strong className="text-white">"{currentPath || '/'}"</strong> and processed. Supported types: PDF, TXT, DOCX.
          </p>
          
          {/* List selected files */}
          {uploadedFiles.length > 0 ? (
            <div className="max-h-60 overflow-y-auto border border-gray-700 rounded-md p-3 bg-gray-800">
              <ul className="text-sm text-gray-300 space-y-1">
                {uploadedFiles.map((file, index) => (
                  <li key={index} className="flex items-center justify-between">
                    <div className="flex items-center truncate">
                      <FileIcon className="h-4 w-4 mr-2 text-blue-400 flex-shrink-0" />
                      <span className="truncate" title={file.name}>{file.name}</span>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{formatFileSize(file.size)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No files selected for upload.</p>
          )}
           <div className="p-3 bg-yellow-900/30 rounded-md border border-yellow-700">
            <p className="text-sm text-yellow-300">
              Processing is a background task. Large files or many files may take time. Check API logs for details.
            </p>
          </div>
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
              disabled={isProcessingDirectory}
            >
              {isProcessingDirectory ? 'Starting...' : 'Start Processing'}
            </Button>
          </div>
        }
      >
        <div>
          <p className="text-sm text-gray-300">
            This will start a background task to process all supported files (PDF, TXT, DOCX) in the directory <strong className="text-white">"{currentPath || '/'}"</strong> and its subdirectories.
          </p>
          <div className="mt-4 p-3 bg-yellow-900/30 rounded-md border border-yellow-700">
            <p className="text-sm text-yellow-300">
              <strong>Note:</strong> This operation may take a significant amount of time depending on the number and size of files. Check the API server logs for detailed progress and any errors.
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
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        }
      >
        <div>
          <p className="text-sm text-gray-300">
            Are you sure you want to delete the {selectedItem?.is_directory ? 'folder' : 'file'} <strong className="text-white">{selectedItem?.name}</strong>?
          </p>
           <p className="mt-2 text-sm text-red-400">
             This action cannot be undone.
             {selectedItem?.is_directory && " All files and subfolders within will also be deleted."}
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

// --- Local FileUploader Trigger Component ---
// This component remains local to RepositoryDetail.tsx
// It acts as a wrapper around a button to trigger a hidden file input.
interface SimpleFileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  accept?: Record<string, string[]>;
  children: React.ReactNode; // Expect a button or trigger element
  className?: string;
  label?: string; // Added label for the trigger button
}

const FileUploader: React.FC<SimpleFileUploaderProps> = ({
  onFilesSelected,
  multiple = false,
  accept,
  children,
  className = '',
  label = 'Upload Files' // Default label
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      onFilesSelected(Array.from(event.target.files));
      // Reset input value to allow selecting the same file again
      event.target.value = '';
    }
  };

  const triggerFileInput = () => {
    inputRef.current?.click();
  };

  // Clone the child (expected to be a Button) and add the onClick handler
  const triggerElement = React.cloneElement(children as React.ReactElement, {
    onClick: triggerFileInput,
    type: 'button', // Ensure it's not submitting a form
    'aria-label': label // Add aria-label
  });

  return (
    <div className={className}>
      <input
        id="local-file-uploader-input" // Added ID for EmptyState trigger
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept ? Object.entries(accept).flatMap(([mime, exts]) => [mime, ...exts]).join(',') : undefined}
        onChange={handleFileChange}
        className="hidden" // Hide the actual input
        aria-hidden="true"
      />
      {triggerElement}
    </div>
  );
};


export default RepositoryDetail;
