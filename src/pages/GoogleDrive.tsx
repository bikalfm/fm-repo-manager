import React, { useState, useEffect } from 'react';
import { FolderOpen, FileText, Download, ArrowLeft, RefreshCw } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { getDriveFolders, getDriveFolderContents, downloadDriveFile, downloadDriveFolder, importDriveToRepository, processDriveFolder, getRepositories } from '../api';
import { DriveFolder, DriveFile, DriveFolderContents } from '../types';
import toast from 'react-hot-toast';

const GoogleDrive: React.FC = () => {
  const [rootFolders, setRootFolders] = useState<DriveFolder[]>([]); // State for /drive/folders result
  const [folderContents, setFolderContents] = useState<DriveFolderContents | null>(null); // State for /drive/list result
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingContents, setLoadingContents] = useState(false);
  const [repositories, setRepositories] = useState<string[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [selectedRepository, setSelectedRepository] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [selectedFolderName, setSelectedFolderName] = useState('');
  const [overwriteFiles, setOverwriteFiles] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chunkSize, setChunkSize] = useState(500);
  const [chunkOverlap, setChunkOverlap] = useState(50);
  const [collectionName, setCollectionName] = useState('');
  const [breadcrumbPath, setBreadcrumbPath] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    fetchRootFolders(); // Fetch root folders on mount
    fetchRepositories();
  }, []);

  useEffect(() => {
    if (currentFolderId && currentFolderId !== 'root') {
      fetchFolderContents(currentFolderId); // Fetch contents only when navigating into a folder
    } else {
      setFolderContents(null); // Clear contents when back at root
      setBreadcrumbPath([]); // Clear breadcrumbs at root
    }
  }, [currentFolderId]);

  const fetchRootFolders = async () => {
    setLoadingFolders(true);
    try {
      const data = await getDriveFolders();
      setRootFolders(data);
    } catch (error) {
      console.error("Error fetching Google Drive root folders:", error);
      toast.error('Failed to fetch Google Drive folders');
    } finally {
      setLoadingFolders(false);
    }
  };

  const fetchFolderContents = async (folderId: string) => {
    setLoadingContents(true);
    setFolderContents(null); // Clear previous contents
    try {
      const data = await getDriveFolderContents(folderId);
      setFolderContents(data);
      
      // Update breadcrumb path when navigating into a folder
      if (data.current_folder) {
         // Check if the folder is already in the path (e.g., navigating via breadcrumb)
        const existingIndex = breadcrumbPath.findIndex(item => item.id === folderId);
        if (existingIndex !== -1) {
          // If navigating via breadcrumb, slice the path
          setBreadcrumbPath(prev => prev.slice(0, existingIndex + 1));
        } else {
           // If navigating directly, add to the path
          setBreadcrumbPath(prev => [...prev, {
            id: data.current_folder!.id,
            name: data.current_folder!.name
          }]);
        }
      }
    } catch (error) {
      console.error("Error fetching folder contents:", error);
      toast.error('Failed to fetch folder contents');
      // Optionally navigate back up if fetch fails
      // navigateUp(); 
    } finally {
      setLoadingContents(false);
    }
  };

  const fetchRepositories = async () => {
    try {
      const data = await getRepositories();
      setRepositories(data);
    } catch (error) {
      console.error("Error fetching repositories:", error);
      toast.error('Failed to fetch repositories');
    }
  };

  const navigateToFolder = (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
  };

  const navigateUp = () => {
    if (breadcrumbPath.length > 0) {
      const newPath = [...breadcrumbPath];
      newPath.pop(); // Remove the current folder
      setBreadcrumbPath(newPath);
      
      // Navigate to the new last folder in the path, or root if path is now empty
      const parentFolderId = newPath.length > 0 ? newPath[newPath.length - 1].id : 'root';
      setCurrentFolderId(parentFolderId);
    } else {
      // Should not happen if button is only shown when not at root, but handle anyway
      setCurrentFolderId('root');
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setCurrentFolderId('root');
    } else {
      const targetFolder = breadcrumbPath[index];
      setCurrentFolderId(targetFolder.id);
      // Slicing path is handled in fetchFolderContents effect
    }
  };


  const handleDownloadFile = (fileId: string) => {
    window.open(downloadDriveFile(fileId), '_blank');
  };

  const handleDownloadFolder = (folderId: string) => {
    window.open(downloadDriveFolder(folderId), '_blank');
  };

  const openImportModal = (folderId: string, folderName: string) => {
    setSelectedFolderId(folderId);
    setSelectedFolderName(folderName);
    setIsImportModalOpen(true);
  };

  const openProcessModal = (folderId: string, folderName: string) => {
    setSelectedFolderId(folderId);
    setSelectedFolderName(folderName);
    setCollectionName(folderName.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
    setIsProcessModalOpen(true);
  };

  const handleImport = async () => {
    if (!selectedRepository || !selectedFolderId) {
      toast.error('Please select a repository');
      return;
    }
    
    setIsImporting(true);
    try {
      const result = await importDriveToRepository(selectedFolderId, selectedRepository, overwriteFiles);
      toast.success(`Import completed: ${result.files_imported} files imported, ${result.files_skipped} skipped`);
      setIsImportModalOpen(false);
    } catch (error) {
      console.error("Error importing files:", error);
      toast.error('Failed to import files');
    } finally {
      setIsImporting(false);
    }
  };

  const handleProcess = async () => {
    if (!selectedFolderId || !collectionName) {
      toast.error('Folder ID and collection name are required');
      return;
    }
    
    setIsProcessing(true);
    try {
      const result = await processDriveFolder({
        folder_id: selectedFolderId,
        collection_name: collectionName,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap
      });
      
      toast.success(`Processing started for ${result.stats.total_files_in_folder} files in collection "${result.collection_name}"`);
      setIsProcessModalOpen(false);
    } catch (error) {
      console.error("Error processing folder:", error);
      toast.error('Failed to start processing');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderBreadcrumbs = () => {
    return (
      <div className="flex items-center text-sm mb-4 overflow-x-auto whitespace-nowrap py-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        <button
          onClick={() => navigateToBreadcrumb(-1)}
          className={`text-gray-400 hover:text-white ${currentFolderId === 'root' ? 'font-bold text-white' : ''}`}
          disabled={currentFolderId === 'root'}
        >
          Root
        </button>
        
        {breadcrumbPath.map((folder, index) => (
          <React.Fragment key={folder.id}>
            <span className="mx-2 text-gray-500">/</span>
            <button
              onClick={() => navigateToBreadcrumb(index)}
              className={`hover:text-white ${index === breadcrumbPath.length - 1 ? 'font-bold text-white' : 'text-gray-400'}`}
              disabled={index === breadcrumbPath.length - 1}
            >
              {folder.name}
            </button>
          </React.Fragment>
        ))}
      </div>
    );
  };

  const isLoading = loadingFolders || loadingContents;
  const isRootView = currentFolderId === 'root';

  return (
    <div className="w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-white sm:text-3xl truncate">
            Google Drive
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={isRootView ? fetchRootFolders : () => fetchFolderContents(currentFolderId)}
            variant="secondary"
            icon={<RefreshCw className="h-4 w-4" />}
            className="w-full sm:w-auto"
            disabled={isLoading}
          >
            Refresh
          </Button>
          {!isRootView && (
            <Button
              onClick={navigateUp}
              variant="outline"
              icon={<ArrowLeft className="h-4 w-4" />}
              className="w-full sm:w-auto"
              disabled={isLoading}
            >
              Back
            </Button>
          )}
          {!isRootView && folderContents?.current_folder && (
            <Button
              onClick={() => handleDownloadFolder(currentFolderId)}
              variant="secondary"
              icon={<Download className="h-4 w-4" />}
              className="w-full sm:w-auto"
              disabled={isLoading}
            >
              Download
            </Button>
          )}
        </div>
      </div>

      {/* Breadcrumbs */}
      {renderBreadcrumbs()}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current Folder Header (only when inside a folder) */}
          {!isRootView && folderContents?.current_folder && (
            <Card>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center">
                  <FolderOpen className="h-6 w-6 text-yellow-500 mr-3 flex-shrink-0" />
                  <h3 className="text-lg font-medium text-white truncate">
                    {folderContents.current_folder.name}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => openImportModal(
                      folderContents.current_folder!.id,
                      folderContents.current_folder!.name
                    )}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    Import
                  </Button>
                  <Button
                    onClick={() => openProcessModal(
                      folderContents.current_folder!.id,
                      folderContents.current_folder!.name
                    )}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    Process
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Content Table/List */}
          {(isRootView && rootFolders.length === 0) || (!isRootView && folderContents && folderContents.folders.length === 0 && folderContents.files.length === 0) ? (
            <EmptyState
              title={isRootView ? "No folders found" : "Empty folder"}
              description={isRootView ? "No top-level folders accessible." : "This folder doesn't contain any files or subfolders."}
              icon={<FolderOpen className="h-8 w-8" />}
            />
          ) : (
            <Card>
              <div className="overflow-x-auto -mx-4 sm:-mx-6">
                <div className="inline-block min-w-full align-middle px-4 sm:px-6">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800">
                      <tr>
                        <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Name
                        </th>
                        {!isRootView && (
                          <>
                            <th scope="col" className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Type
                            </th>
                            <th scope="col" className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Size
                            </th>
                            <th scope="col" className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Modified
                            </th>
                          </>
                        )}
                        <th scope="col" className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-900 divide-y divide-gray-700">
                      {/* Render Root Folders */}
                      {isRootView && rootFolders.map((folder) => (
                        <tr key={folder.id} className="hover:bg-gray-800">
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FolderOpen className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0" />
                              <button
                                onClick={() => navigateToFolder(folder.id, folder.name)}
                                className="text-sm font-medium text-white hover:text-blue-400 truncate max-w-[150px] sm:max-w-xs"
                                title={folder.name}
                              >
                                {folder.name}
                              </button>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end flex-wrap gap-2">
                              <div className="flex space-x-1 sm:space-x-2">
                                <Button
                                  onClick={() => handleDownloadFolder(folder.id)}
                                  variant="outline"
                                  size="sm"
                                  icon={<Download className="h-4 w-4" />}
                                  className="px-2 sm:px-2.5"
                                >
                                  <span className="hidden sm:inline">Download</span>
                                </Button>
                                <Button
                                  onClick={() => openImportModal(folder.id, folder.name)}
                                  variant="outline"
                                  size="sm"
                                  className="px-2 sm:px-2.5"
                                >
                                  <span className="hidden sm:inline">Import</span>
                                  <span className="sm:hidden">Imp</span>
                                </Button>
                                <Button
                                  onClick={() => openProcessModal(folder.id, folder.name)}
                                  size="sm"
                                  className="px-2 sm:px-2.5"
                                >
                                  <span className="hidden sm:inline">Process</span>
                                  <span className="sm:hidden">Proc</span>
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {/* Render Folder Contents */}
                      {!isRootView && folderContents?.folders.map((folder) => (
                        <tr key={folder.id} className="hover:bg-gray-800">
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FolderOpen className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0" />
                              <button
                                onClick={() => navigateToFolder(folder.id, folder.name)}
                                className="text-sm font-medium text-white hover:text-blue-400 truncate max-w-[150px] sm:max-w-xs"
                                title={folder.name}
                              >
                                {folder.name}
                              </button>
                            </div>
                          </td>
                          <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-400">Folder</div>
                          </td>
                          <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-400">-</div>
                          </td>
                          <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-400">-</div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end flex-wrap gap-2">
                              <div className="flex space-x-1 sm:space-x-2">
                                <Button
                                  onClick={() => handleDownloadFolder(folder.id)}
                                  variant="outline"
                                  size="sm"
                                  icon={<Download className="h-4 w-4" />}
                                  className="px-2 sm:px-2.5"
                                >
                                  <span className="hidden sm:inline">Download</span>
                                </Button>
                                <Button
                                  onClick={() => openImportModal(folder.id, folder.name)}
                                  variant="outline"
                                  size="sm"
                                  className="px-2 sm:px-2.5"
                                >
                                  <span className="hidden sm:inline">Import</span>
                                  <span className="sm:hidden">Imp</span>
                                </Button>
                                <Button
                                  onClick={() => openProcessModal(folder.id, folder.name)}
                                  size="sm"
                                  className="px-2 sm:px-2.5"
                                >
                                  <span className="hidden sm:inline">Process</span>
                                  <span className="sm:hidden">Proc</span>
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                      
                      {!isRootView && folderContents?.files.map((file) => (
                        <tr key={file.id} className="hover:bg-gray-800">
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FileText className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                              <div className="text-sm font-medium text-white truncate max-w-[150px] sm:max-w-xs" title={file.name}>
                                {file.name}
                              </div>
                            </div>
                          </td>
                          <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-400 truncate max-w-[100px] sm:max-w-xs" title={file.mime_type}>
                              {file.mime_type}
                            </div>
                          </td>
                          <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-400">{formatFileSize(parseInt(file.size, 10))}</div>
                          </td>
                          <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-400">{new Date(file.modified_time).toLocaleString()}</div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button
                              onClick={() => handleDownloadFile(file.id)}
                              variant="outline"
                              size="sm"
                              icon={<Download className="h-4 w-4" />}
                              className="px-2 sm:px-2.5"
                            >
                              <span className="hidden sm:inline">Download</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Modals (unchanged) */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title={`Import from Google Drive: ${selectedFolderName}`}
        size="md"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setIsImportModalOpen(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              isLoading={isImporting}
              disabled={!selectedRepository}
            >
              Import
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Select a repository to import files from Google Drive folder "{selectedFolderName}".
          </p>
          
          <div>
            <label htmlFor="repository" className="block text-sm font-medium text-white mb-1">
              Target Repository
            </label>
            <select
              id="repository"
              value={selectedRepository}
              onChange={(e) => setSelectedRepository(e.target.value)}
              className="block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm"
            >
              <option value="">Select a repository</option>
              {repositories.map((repo) => (
                <option key={repo} value={repo}>{repo}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center">
            <input
              id="overwrite"
              type="checkbox"
              checked={overwriteFiles}
              onChange={(e) => setOverwriteFiles(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-700 rounded bg-gray-800"
            />
            <label htmlFor="overwrite" className="ml-2 block text-sm text-white">
              Overwrite existing files
            </label>
          </div>
          
          <div className="p-3 bg-yellow-900/30 rounded-md border border-yellow-700">
            <p className="text-sm text-yellow-300">
              <strong>Note:</strong> Only supported file types (PDF, TXT, DOCX) will be imported. Other file types will be skipped.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isProcessModalOpen}
        onClose={() => setIsProcessModalOpen(false)}
        title={`Process Google Drive Folder: ${selectedFolderName}`}
        size="md"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setIsProcessModalOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProcess}
              isLoading={isProcessing}
              disabled={!collectionName}
            >
              Process
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Process files from Google Drive folder "{selectedFolderName}" and add them to a vector database collection.
          </p>
          
          <div>
            <label htmlFor="collection-name" className="block text-sm font-medium text-white mb-1">
              Collection Name
            </label>
            <input
              type="text"
              id="collection-name"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              className="block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm"
              placeholder="e.g., medical_research"
            />
            <p className="mt-1 text-xs text-gray-500">
              Use only letters, numbers, and underscores. No spaces or special characters.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="chunk-size" className="block text-sm font-medium text-white mb-1">
                Chunk Size
              </label>
              <input
                type="number"
                id="chunk-size"
                value={chunkSize}
                onChange={(e) => setChunkSize(parseInt(e.target.value, 10))}
                min="100"
                max="5000"
                className="block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="chunk-overlap" className="block text-sm font-medium text-white mb-1">
                Chunk Overlap
              </label>
              <input
                type="number"
                id="chunk-overlap"
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(parseInt(e.target.value, 10))}
                min="0"
                max="1000"
                className="block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm"
              />
            </div>
          </div>
          
          <div className="p-3 bg-yellow-900/30 rounded-md border border-yellow-700">
            <p className="text-sm text-yellow-300">
              <strong>Note:</strong> Processing may take some time depending on the number and size of files. Only PDF files will be processed.
            </p>
          </div>
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

export default GoogleDrive;
