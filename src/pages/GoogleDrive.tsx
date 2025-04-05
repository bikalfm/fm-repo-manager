import React, { useState, useEffect } from 'react';
import { FolderOpen, FileText, Download, ArrowLeft, RefreshCw, Zap, Database } from 'lucide-react'; // Added Database icon
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { getDriveFolders, getDriveFolderContents, downloadDriveFile, downloadDriveFolder, syncDriveToRepository, processDriveFolder, getRepositories } from '../api';
import { DriveFolder, DriveFile, DriveFolderContents } from '../types';
import toast from 'react-hot-toast';
import axios from 'axios';

const GoogleDrive: React.FC = () => {
  const [rootFolders, setRootFolders] = useState<DriveFolder[]>([]);
  const [folderContents, setFolderContents] = useState<DriveFolderContents | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingContents, setLoadingContents] = useState(false);
  const [repositories, setRepositories] = useState<string[]>([]);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [selectedRepository, setSelectedRepository] = useState('');
  const [selectedFolderIdForProcess, setSelectedFolderIdForProcess] = useState<string | null>(null); // Specific state for processing
  const [selectedFolderNameForModal, setSelectedFolderNameForModal] = useState('');
  const [overwriteFiles, setOverwriteFiles] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chunkSize, setChunkSize] = useState(500);
  const [chunkOverlap, setChunkOverlap] = useState(50);
  const [collectionName, setCollectionName] = useState('');
  const [breadcrumbPath, setBreadcrumbPath] = useState<{id: string, name: string}[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRootFolders();
    fetchRepositories();
  }, []);

  useEffect(() => {
    setError(null); // Clear error when navigating
    if (currentFolderId && currentFolderId !== 'root') {
      fetchFolderContents(currentFolderId);
    } else {
      setFolderContents(null);
      setBreadcrumbPath([]);
      setLoadingContents(false); // Ensure loading stops if navigating back to root
    }
  }, [currentFolderId]);

  const fetchRootFolders = async () => {
    setLoadingFolders(true);
    setError(null);
    try {
      const data = await getDriveFolders();
      setRootFolders(data);
    } catch (err) {
      setError('Failed to fetch Google Drive folders. Check API connection and permissions.');
      toast.error('Failed to fetch Google Drive folders');
      console.error("Error fetching Google Drive root folders:", err);
    } finally {
      setLoadingFolders(false);
    }
  };

  const fetchFolderContents = async (folderId: string) => {
    setLoadingContents(true);
    setError(null);
    setFolderContents(null); // Clear previous contents
    try {
      const data = await getDriveFolderContents(folderId);
      setFolderContents(data);
      // Update breadcrumbs based on the fetched current_folder
      if (data.current_folder) {
        const existingIndex = breadcrumbPath.findIndex(item => item.id === folderId);
        if (existingIndex !== -1) {
          // Navigating back via breadcrumb, truncate path
          setBreadcrumbPath(prev => prev.slice(0, existingIndex + 1));
        } else {
          // Navigating deeper, add to path
          setBreadcrumbPath(prev => [...prev, {
            id: data.current_folder!.id,
            name: data.current_folder!.name
          }]);
        }
      } else if (folderId !== 'root') {
        // If current_folder is null but we are not at root, something might be wrong
        setError(`Could not retrieve details for the current folder (ID: ${folderId}).`);
        toast.error('Error retrieving folder details.');
      }
    } catch (err) {
      setError(`Failed to fetch contents for folder ID: ${folderId}.`);
      toast.error('Failed to fetch folder contents');
      console.error("Error fetching folder contents:", err);
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

  const navigateToFolder = (folderId: string) => {
    setCurrentFolderId(folderId);
  };

  const navigateUp = () => {
    if (breadcrumbPath.length > 0) {
      const parentFolderId = breadcrumbPath.length > 1 ? breadcrumbPath[breadcrumbPath.length - 2].id : 'root';
      setCurrentFolderId(parentFolderId);
    } else {
      setCurrentFolderId('root'); // Should not happen if button is shown correctly, but safe fallback
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    const targetFolderId = index === -1 ? 'root' : breadcrumbPath[index].id;
    setCurrentFolderId(targetFolderId);
  };

  const handleDownloadFile = (fileId: string, fileName: string) => {
    try {
      const url = downloadDriveFile(fileId);
      window.open(url, '_blank');
    } catch (error) {
      toast.error(`Failed to initiate download for ${fileName}`);
      console.error("Download file error:", error);
    }
  };

  const handleDownloadFolder = (folderId: string, folderName: string) => {
     try {
       const url = downloadDriveFolder(folderId);
       window.open(url, '_blank');
     } catch (error) {
       toast.error(`Failed to initiate download for folder ${folderName}`);
       console.error("Download folder error:", error);
     }
  };

  const openSyncModal = () => {
    setSelectedRepository(''); // Reset selected repo
    setOverwriteFiles(false); // Reset overwrite flag
    setIsSyncModalOpen(true);
  };

  const openProcessModal = (folderId: string, folderName: string) => {
    setSelectedFolderIdForProcess(folderId); // Store the ID for processing
    setSelectedFolderNameForModal(folderName);
    // Suggest a collection name based on folder name, sanitized
    setCollectionName(folderName.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'drive_collection');
    setIsProcessModalOpen(true);
  };

  const handleSync = async () => {
    if (!selectedRepository) {
      toast.error('Please select a repository to sync');
      return;
    }

    setIsSyncing(true);
    const toastId = toast.loading(`Syncing Google Drive with repository "${selectedRepository}"...`);
    try {
      const result = await syncDriveToRepository(selectedRepository, overwriteFiles);
      toast.success(`Sync completed: ${result.files_downloaded} files downloaded, ${result.files_skipped} skipped.`, { id: toastId, duration: 5000 });
      if (result.errors && result.errors.length > 0) {
        console.error("Sync errors:", result.errors);
        toast.error(`Sync completed with ${result.errors.length} errors. Check console for details.`, { duration: 5000 });
      }
      setIsSyncModalOpen(false);
      // Optionally refresh the corresponding repository view if the user navigates there later
    } catch (error) {
      console.error("Error syncing repository:", error);
      let errorMessage = 'Failed to sync repository.';
      if (axios.isAxiosError(error) && error.response?.status === 404) {
         errorMessage = `Sync failed: Google Drive folder named "${selectedRepository}" not found or inaccessible.`;
      } else if (error instanceof Error) {
         errorMessage = `Sync failed: ${error.message}`;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };


  const handleProcess = async () => {
    if (!selectedFolderIdForProcess || !collectionName) {
      toast.error('Folder ID and collection name are required for processing');
      return;
    }
    // Basic validation for collection name (alphanumeric and underscore)
    if (!/^[a-z0-9_]+$/.test(collectionName)) {
       toast.error('Invalid collection name. Use only lowercase letters, numbers, and underscores.');
       return;
    }


    setIsProcessing(true);
    const toastId = toast.loading(`Starting processing for folder "${selectedFolderNameForModal}" into collection "${collectionName}"...`);
    try {
      const result = await processDriveFolder({
        folder_id: selectedFolderIdForProcess,
        collection_name: collectionName,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap
      });

      toast.success(`Processing started for ${result.stats.total_files_in_folder} files. Check API logs for progress.`, { id: toastId, duration: 5000 });
      if (result.stats.errors && result.stats.errors.length > 0) {
        console.error("Processing errors:", result.stats.errors);
        toast.error(`Processing started with ${result.stats.errors.length} initial errors. Check console/API logs.`, { duration: 5000 });
      }
      setIsProcessModalOpen(false);
    } catch (error) {
      console.error("Error starting folder processing:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start processing.';
      toast.error(`Error: ${errorMessage}`, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderBreadcrumbs = () => {
    return (
      <nav className="flex items-center text-sm mb-4 overflow-x-auto whitespace-nowrap py-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <button
              onClick={() => navigateToBreadcrumb(-1)}
              className={`hover:text-white ${currentFolderId === 'root' ? 'font-semibold text-white cursor-default' : 'text-gray-400'}`}
              disabled={currentFolderId === 'root'}
              aria-current={currentFolderId === 'root' ? 'page' : undefined}
            >
              Google Drive Root
            </button>
          </li>

          {breadcrumbPath.map((folder, index) => (
            <li key={folder.id}>
              <div className="flex items-center">
                <span className="mx-2 text-gray-500">/</span>
                <button
                  onClick={() => navigateToBreadcrumb(index)}
                  className={`hover:text-white truncate max-w-[150px] sm:max-w-xs ${index === breadcrumbPath.length - 1 ? 'font-semibold text-white cursor-default' : 'text-gray-400'}`}
                  disabled={index === breadcrumbPath.length - 1}
                  aria-current={index === breadcrumbPath.length - 1 ? 'page' : undefined}
                  title={folder.name}
                >
                  {folder.name}
                </button>
              </div>
            </li>
          ))}
        </ol>
      </nav>
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
            Google Drive Browser
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
           <Button
             onClick={openSyncModal}
             variant="primary"
             icon={<Zap className="h-4 w-4" />}
             className="w-full sm:w-auto"
             disabled={isLoading || isSyncing}
             title="Sync a repository folder from Google Drive"
           >
             Sync Repository
           </Button>
          <Button
            onClick={isRootView ? fetchRootFolders : () => fetchFolderContents(currentFolderId)}
            variant="secondary"
            icon={<RefreshCw className="h-4 w-4" />}
            className="w-full sm:w-auto"
            disabled={isLoading}
            title="Refresh current view"
          >
            Refresh
          </Button>
          {!isRootView && (
            <Button
              onClick={navigateUp}
              variant="outline"
              icon={<ArrowLeft className="h-4 w-4" />}
              className="w-full sm:w-auto"
              disabled={isLoading || breadcrumbPath.length === 0}
              title="Go to parent folder"
            >
              Back
            </Button>
          )}
        </div>
      </div>

      {/* Breadcrumbs */}
      {renderBreadcrumbs()}

      {/* Loading or Error State */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      ) : error ? (
         <Card>
           <p className="text-center text-red-400">{error}</p>
           <div className="mt-4 text-center">
             <Button onClick={isRootView ? fetchRootFolders : () => fetchFolderContents(currentFolderId)}>Retry</Button>
           </div>
         </Card>
      ) : (
        // Content Display
        <div className="space-y-6">
          {/* Current Folder Header & Actions (only when inside a folder) */}
          {!isRootView && folderContents?.current_folder && (
            <Card>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center min-w-0">
                  <FolderOpen className="h-6 w-6 text-yellow-500 mr-3 flex-shrink-0" />
                  <h3 className="text-lg font-medium text-white truncate" title={folderContents.current_folder.name}>
                    {folderContents.current_folder.name}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 flex-shrink-0">
                  <Button
                    onClick={() => handleDownloadFolder(currentFolderId, folderContents.current_folder!.name)}
                    variant="secondary"
                    icon={<Download className="h-4 w-4" />}
                    className="w-full sm:w-auto"
                    disabled={isLoading}
                    title={`Download folder "${folderContents.current_folder.name}" as ZIP`}
                  >
                    Download Folder
                  </Button>
                  <Button
                    onClick={() => openProcessModal(
                      folderContents.current_folder!.id,
                      folderContents.current_folder!.name
                    )}
                    size="md" // Keep md size for consistency
                    className="w-full sm:w-auto"
                    disabled={isLoading || isProcessing}
                    title={`Process files in "${folderContents.current_folder.name}"`}
                  >
                    Process Folder
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Content Table/List */}
          {(isRootView && rootFolders.length === 0) || (!isRootView && folderContents && folderContents.folders.length === 0 && folderContents.files.length === 0) ? (
            <EmptyState
              title={isRootView ? "No folders found" : "Empty folder"}
              description={isRootView ? "No top-level folders accessible or found in your Google Drive." : "This folder doesn't contain any files or subfolders."}
              icon={<FolderOpen className="h-8 w-8" />}
            />
          ) : (
            <Card>
              <div className="overflow-x-auto table-responsive">
                {/* Added table-zebra class */}
                <table className="min-w-full divide-y divide-gray-700 table-zebra">
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
                  {/* Removed tbody background */}
                  <tbody className="divide-y divide-gray-700">
                    {/* Render Root Folders */}
                    {isRootView && rootFolders.map((folder) => (
                      <tr key={folder.id}>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FolderOpen className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0" />
                            <button
                              onClick={() => navigateToFolder(folder.id)}
                              className="text-sm font-medium text-white hover:text-blue-400 truncate max-w-[150px] sm:max-w-xs md:max-w-md"
                              title={folder.name}
                            >
                              {folder.name}
                            </button>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end flex-wrap gap-2">
                            <Button
                              onClick={() => handleDownloadFolder(folder.id, folder.name)}
                              variant="outline"
                              size="sm"
                              icon={<Download className="h-4 w-4" />}
                              className="px-2 sm:px-2.5"
                              title={`Download folder "${folder.name}" as ZIP`}
                            >
                              <span className="hidden sm:inline">Download</span>
                            </Button>
                            <Button
                              onClick={() => openProcessModal(folder.id, folder.name)}
                              size="sm"
                              className="px-2 sm:px-2.5"
                              title={`Process files in "${folder.name}"`}
                            >
                              <span className="hidden sm:inline">Process</span>
                              <span className="sm:hidden">Proc</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* Render Subfolders */}
                    {!isRootView && folderContents?.folders.map((folder) => (
                      <tr key={folder.id}>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FolderOpen className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0" />
                            <button
                              onClick={() => navigateToFolder(folder.id)}
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
                            <Button
                              onClick={() => handleDownloadFolder(folder.id, folder.name)}
                              variant="outline"
                              size="sm"
                              icon={<Download className="h-4 w-4" />}
                              className="px-2 sm:px-2.5"
                              title={`Download folder "${folder.name}" as ZIP`}
                            >
                              <span className="hidden sm:inline">Download</span>
                            </Button>
                            <Button
                              onClick={() => openProcessModal(folder.id, folder.name)}
                              size="sm"
                              className="px-2 sm:px-2.5"
                              title={`Process files in "${folder.name}"`}
                            >
                              <span className="hidden sm:inline">Process</span>
                              <span className="sm:hidden">Proc</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* Render Files */}
                    {!isRootView && folderContents?.files.map((file) => (
                      <tr key={file.id}>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0" />
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
                            onClick={() => handleDownloadFile(file.id, file.name)}
                            variant="outline"
                            size="sm"
                            icon={<Download className="h-4 w-4" />}
                            className="px-2 sm:px-2.5"
                            title={`Download file "${file.name}"`}
                          >
                            <span className="hidden sm:inline">Download</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Sync Modal */}
      <Modal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        title="Sync Google Drive with Repository"
        size="md"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setIsSyncModalOpen(false)}
              disabled={isSyncing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSync}
              isLoading={isSyncing}
              disabled={!selectedRepository || isSyncing}
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Select a repository. This action will find a Google Drive folder with the <strong className="text-white">exact same name</strong> as the repository and download its contents (files only, no subfolders) into the repository storage.
          </p>

          <div>
            <label htmlFor="repository-sync" className="block text-sm font-medium text-white mb-1">
              Target Repository
            </label>
            <select
              id="repository-sync"
              value={selectedRepository}
              onChange={(e) => setSelectedRepository(e.target.value)}
              className="block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm disabled:opacity-50"
              disabled={repositories.length === 0 || isSyncing}
            >
              {repositories.length === 0 ? (
                 <option value="">No repositories available</option>
              ) : (
                <>
                  <option value="">Select a repository</option>
                  {repositories.map((repo) => (
                    <option key={repo} value={repo}>{repo}</option>
                  ))}
                </>
              )}
            </select>
             <p className="mt-1 text-xs text-gray-500">
               Ensure a Google Drive folder named "{selectedRepository || '<repository_name>'}" exists at the root level and is accessible by the API.
             </p>
          </div>

          <div className="flex items-center">
            <input
              id="overwrite-sync"
              type="checkbox"
              checked={overwriteFiles}
              onChange={(e) => setOverwriteFiles(e.target.checked)}
              className="h-4 w-4 text-blue-500 focus:ring-blue-400 border-gray-700 rounded bg-gray-800 disabled:opacity-50"
              disabled={isSyncing}
            />
            <label htmlFor="overwrite-sync" className="ml-2 block text-sm text-white">
              Overwrite existing files in the repository if names match
            </label>
          </div>

          <div className="p-3 bg-yellow-900/30 rounded-md border border-yellow-700">
            <p className="text-sm text-yellow-300">
              <strong>Note:</strong> Only files directly within the matching Google Drive folder will be synced. Supported file types (PDF, TXT, DOCX) will be downloaded. This might take several minutes depending on file sizes and count.
            </p>
          </div>
        </div>
      </Modal>

      {/* Process Modal */}
      <Modal
        isOpen={isProcessModalOpen}
        onClose={() => setIsProcessModalOpen(false)}
        title={`Process Drive Folder: ${selectedFolderNameForModal}`}
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
              disabled={!collectionName || !selectedFolderIdForProcess || isProcessing || !/^[a-z0-9_]+$/.test(collectionName)}
            >
              {isProcessing ? 'Processing...' : 'Start Processing'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Process PDF files from Google Drive folder "<strong className="text-white">{selectedFolderNameForModal}</strong>" and add their content as vectors to the specified collection in the vector database.
          </p>

          <div>
            <label htmlFor="collection-name" className="block text-sm font-medium text-white mb-1">
              Target Collection Name
            </label>
            <input
              type="text"
              id="collection-name"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              className="block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm disabled:opacity-50"
              placeholder="e.g., medical_research_pdfs"
              disabled={isProcessing}
              pattern="[a-z0-9_]+" // Basic pattern validation hint
            />
            <p className="mt-1 text-xs text-gray-500">
              Use only lowercase letters, numbers, and underscores.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="chunk-size" className="block text-sm font-medium text-white mb-1">
                Chunk Size (chars)
              </label>
              <input
                type="number"
                id="chunk-size"
                value={chunkSize}
                onChange={(e) => setChunkSize(Math.max(100, parseInt(e.target.value, 10) || 100))}
                min="100"
                max="5000"
                step="50"
                className="block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm disabled:opacity-50"
                disabled={isProcessing}
              />
            </div>

            <div>
              <label htmlFor="chunk-overlap" className="block text-sm font-medium text-white mb-1">
                Chunk Overlap (chars)
              </label>
              <input
                type="number"
                id="chunk-overlap"
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(Math.max(0, parseInt(e.target.value, 10) || 0))}
                min="0"
                max="1000"
                step="10"
                className="block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm disabled:opacity-50"
                disabled={isProcessing}
              />
            </div>
          </div>

          <div className="p-3 bg-yellow-900/30 rounded-md border border-yellow-700">
            <p className="text-sm text-yellow-300">
              <strong>Note:</strong> Processing is a background task and may take significant time. Only PDF files within the selected folder will be processed. Check API logs for detailed progress.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (isNaN(bytes) || bytes < 0) return 'N/A';
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.max(0, Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default GoogleDrive;
