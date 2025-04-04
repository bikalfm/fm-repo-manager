import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FolderPlus, Upload, Trash2, Download, RefreshCw, File as FileIcon } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import FileUploader from '../components/FileUploader';
import EmptyState from '../components/EmptyState';
import { listRepositoryFiles, createFolder, deleteFolder, deleteFile, downloadFile, processFile, processDirectory } from '../api';
import { FileInfo } from '../types';
import toast from 'react-hot-toast';

const RepositoryDetail: React.FC = () => {
  const { repositoryName, path } = useParams<{ repositoryName: string; path?: string }>();
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (repositoryName) {
      fetchFiles();
    }
  }, [repositoryName, currentPath]);

  const fetchFiles = async () => {
    if (!repositoryName) return;
    
    setLoading(true);
    try {
      const data = await listRepositoryFiles(repositoryName, currentPath);
      setFiles(data);
    } catch (error) {
      console.error("Error fetching files:", error);
      toast.error('Failed to fetch files');
    } finally {
      setLoading(false);
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
      fetchFiles();
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
      fetchFiles();
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
    try {
      for (const file of uploadedFiles) {
        await processFile(repositoryName, file, currentPath);
        toast.success(`File "${file.name}" processed successfully`);
      }
      setIsUploadModalOpen(false);
      setUploadedFiles([]);
      fetchFiles();
    } catch (error) {
      console.error("Error processing files:", error);
      toast.error('Failed to process files');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessDirectory = async () => {
    if (!repositoryName) return;
    
    setIsProcessing(true);
    try {
      await processDirectory(repositoryName, currentPath);
      toast.success('Directory processing started');
      setIsProcessingModalOpen(false);
    } catch (error) {
      console.error("Error processing directory:", error);
      toast.error('Failed to process directory');
    } finally {
      setIsProcessing(false);
    }
  };

  const navigateToFolder = (folderPath: string) => {
    navigate(`/repositories/${repositoryName}/${folderPath}`);
    setCurrentPath(folderPath);
  };

  const navigateUp = () => {
    if (!currentPath) return;
    
    const pathParts = currentPath.split('/');
    pathParts.pop();
    const newPath = pathParts.join('/');
    
    if (newPath) {
      navigate(`/repositories/${repositoryName}/${newPath}`);
      setCurrentPath(newPath);
    } else {
      navigate(`/repositories/${repositoryName}`);
      setCurrentPath('');
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
    if (!currentPath) {
      return (
        <div className="flex items-center text-sm">
          <span className="font-medium text-gray-900">{repositoryName}</span>
        </div>
      );
    }

    const pathParts = currentPath.split('/');
    
    return (
      <div className="flex items-center text-sm">
        <button
          onClick={() => navigate(`/repositories/${repositoryName}`)}
          className="text-blue-600 hover:text-blue-800"
        >
          {repositoryName}
        </button>
        
        {pathParts.map((part, index) => (
          <React.Fragment key={index}>
            <span className="mx-2 text-gray-500">/</span>
            {index === pathParts.length - 1 ? (
              <span className="font-medium text-gray-900">{part}</span>
            ) : (
              <button
                onClick={() => navigateToFolder(pathParts.slice(0, index + 1).join('/'))}
                className="text-blue-600 hover:text-blue-800"
              >
                {part}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Repository: {repositoryName}
          </h2>
          <div className="mt-2">
            {renderBreadcrumbs()}
          </div>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
          <Button
            onClick={() => fetchFiles()}
            variant="secondary"
            icon={<RefreshCw className="h-4 w-4" />}
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
          >
            ← Up to parent directory
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : files.length === 0 ? (
        <EmptyState
          title="No files found"
          description="Upload files or create folders to get started."
          icon={<Upload className="h-8 w-8" />}
          actionText="Upload Files"
          onAction={() => setIsUploadModalOpen(true)}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modified
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {files.map((file) => (
                  <tr key={file.path} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {file.is_directory ? (
                          <FolderPlus className="h-5 w-5 text-yellow-500 mr-3" />
                        ) : (
                          <FileIcon className="h-5 w-5 text-blue-500 mr-3" />
                        )}
                        <div className="text-sm font-medium text-gray-900">
                          {file.is_directory ? (
                            <button
                              onClick={() => navigateToFolder(file.path)}
                              className="hover:text-blue-600"
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
                      <div className="text-sm text-gray-500">
                        {file.is_directory ? 'Folder' : (file.content_type || 'File')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {file.is_directory ? '-' : formatFileSize(file.size)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
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
          <label htmlFor="folder-name" className="block text-sm font-medium text-gray-700">
            Folder Name
          </label>
          <input
            type="text"
            id="folder-name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
          <p className="text-sm text-gray-500">
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
              <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Files:</h4>
              <ul className="text-sm text-gray-500 space-y-1">
                {uploadedFiles.map((file, index) => (
                  <li key={index} className="flex items-center">
                    <FileIcon className="h-4 w-4 mr-2 text-blue-500" />
                    {file.name} ({formatFileSize(file.size)})
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
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProcessDirectory}
              isLoading={isProcessing}
            >
              Process
            </Button>
          </div>
        }
      >
        <div>
          <p className="text-sm text-gray-500">
            This will process all supported files in the current directory ({currentPath || 'root'}) and add them to the vector database for searching. This operation may take some time depending on the number and size of files.
          </p>
          <div className="mt-4 p-3 bg-yellow-50 rounded-md">
            <p className="text-sm text-yellow-700">
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
          <p className="text-sm text-gray-500">
            Are you sure you want to delete {selectedItem?.is_directory ? 'folder' : 'file'} <span className="font-semibold">{selectedItem?.name}</span>? This action cannot be undone.
            
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
