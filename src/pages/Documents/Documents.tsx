import React, { useState, useEffect } from 'react';
    import { FileText, Search, Download, Trash2, RefreshCw } from 'lucide-react';
    import Card from '../../components/Card'; // Adjusted import path
    import Button from '../../components/Button'; // Adjusted import path
    import SearchBar from '../../components/SearchBar'; // Adjusted import path
    import EmptyState from '../../components/EmptyState'; // Adjusted import path
    import Spinner from '../../components/Spinner'; // Adjusted import path
    import { getRepositories, listRepositoryFiles, downloadFile, deleteFile } from '../../api'; // Adjusted import path
    import { FileInfo } from '../../types'; // Adjusted import path
    import toast from 'react-hot-toast';

    const Documents: React.FC = () => {
      const [repositories, setRepositories] = useState<string[]>([]);
      const [selectedRepository, setSelectedRepository] = useState<string>('');
      const [files, setFiles] = useState<FileInfo[]>([]);
      const [filteredFiles, setFilteredFiles] = useState<FileInfo[]>([]);
      const [loading, setLoading] = useState(true); // For initial load
      const [isRefreshing, setIsRefreshing] = useState(false); // For refresh button
      const [searchQuery, setSearchQuery] = useState('');
      const [isDeleting, setIsDeleting] = useState<string | null>(null); // Track deleting state by file path

      useEffect(() => {
        fetchRepositories();
      }, []);

      useEffect(() => {
        if (selectedRepository) {
          fetchFiles();
        } else {
          setFiles([]); // Clear files if no repo is selected
          setLoading(false); // Stop loading if no repo selected
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [selectedRepository]);

      useEffect(() => {
        filterFiles();
         // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [files, searchQuery]);

      const fetchRepositories = async () => {
        try {
          const data = await getRepositories();
          setRepositories(data);
          if (data.length > 0 && !selectedRepository) { // Select first repo only if none is selected
            setSelectedRepository(data[0]);
          } else if (data.length === 0) {
            setLoading(false); // No repos, stop loading
          }
        } catch (error) {
          toast.error('Failed to fetch repositories');
          setLoading(false); // Stop loading on error
        }
      };

      const fetchFiles = async (refresh = false) => {
        if (!selectedRepository) return;

        if (refresh) {
          setIsRefreshing(true);
        } else {
          setLoading(true);
        }
        try {
          // Reset files before fetching
          setFiles([]);
          const data = await listRepositoryFiles(selectedRepository);
          // Recursively get all files from all directories
          const allFiles = await getAllFiles(selectedRepository, data);
          setFiles(allFiles);
        } catch (error) {
          toast.error('Failed to fetch files');
        } finally {
          if (refresh) {
            setIsRefreshing(false);
          } else {
            setLoading(false);
          }
        }
      };

      const getAllFiles = async (repository: string, items: FileInfo[]): Promise<FileInfo[]> => {
        let allFiles: FileInfo[] = [];

        for (const item of items) {
          if (item.is_directory) {
            try {
              const subItems = await listRepositoryFiles(repository, item.path);
              const subFiles = await getAllFiles(repository, subItems);
              allFiles = [...allFiles, ...subFiles];
            } catch (error) {
              console.error(`Error fetching files from ${item.path}:`, error);
              // Optionally show a toast for specific folder errors
              // toast.error(`Could not list files in ${item.name}`);
            }
          } else {
            allFiles.push(item);
          }
        }

        return allFiles;
      };

      const filterFiles = () => {
        if (!searchQuery) {
          setFilteredFiles(files);
          return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = files.filter(file =>
          file.name.toLowerCase().includes(query) ||
          file.path.toLowerCase().includes(query)
        );

        setFilteredFiles(filtered);
      };

      const handleSearch = (query: string) => {
        setSearchQuery(query);
      };

      const handleRepositoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedRepository(e.target.value);
      };

      const handleDownload = (file: FileInfo) => {
        if (!selectedRepository) return;
        window.open(downloadFile(selectedRepository, file.path), '_blank');
      };

      const handleDelete = async (file: FileInfo) => {
        if (!selectedRepository) return;

        setIsDeleting(file.path); // Set deleting state for this specific file
        try {
          await deleteFile(selectedRepository, file.path);
          toast.success(`File "${file.name}" deleted successfully`);
          fetchFiles(true); // Refresh after deleting
        } catch (error) {
          toast.error('Failed to delete file');
        } finally {
          setIsDeleting(null); // Reset deleting state
        }
      };

      const getFileIcon = (mimeType: string | null) => {
        if (!mimeType) return <FileText className="h-5 w-5 text-blue-400" />;

        if (mimeType.includes('pdf')) {
          return <FileText className="h-5 w-5 text-red-500" />;
        } else if (mimeType.includes('word') || mimeType.includes('docx')) {
          return <FileText className="h-5 w-5 text-blue-500" />;
        } else if (mimeType.includes('text')) {
          return <FileText className="h-5 w-5 text-gray-400" />;
        }

        return <FileText className="h-5 w-5 text-blue-400" />;
      };

      return (
        <div>
          <div className="md:flex md:items-center md:justify-between mb-8">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-white sm:text-3xl sm:truncate">
                Documents
              </h2>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
              <Button
                onClick={() => fetchFiles(true)} // Pass true for refresh
                variant="secondary"
                icon={<RefreshCw className="h-4 w-4" />}
                isLoading={isRefreshing} // Use isRefreshing state
                disabled={!selectedRepository}
              >
                Refresh
              </Button>
            </div>
          </div>

          <Card className="mb-8">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <label htmlFor="repository" className="block text-sm font-medium text-white mb-1">
                    Repository
                  </label>
                  <select
                    id="repository"
                    value={selectedRepository}
                    onChange={handleRepositoryChange}
                    className="block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm"
                  >
                     <option value="" disabled={repositories.length > 0}>
                      {repositories.length > 0 ? 'Select a repository' : 'No repositories available'}
                    </option>
                    {repositories.map((repo) => (
                      <option key={repo} value={repo}>{repo}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label htmlFor="search" className="block text-sm font-medium text-white mb-1">
                    Search Files
                  </label>
                  <SearchBar
                    onSearch={handleSearch}
                    placeholder="Search by filename or path..."
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </Card>

          {loading ? (
            <Spinner className="py-12" /> // Use Spinner component
          ) : !selectedRepository ? (
             <EmptyState
              title="No Repository Selected"
              description="Please select a repository to view documents."
              icon={<FileText className="h-8 w-8" />}
            />
          ) : filteredFiles.length === 0 ? (
            <EmptyState
              title="No documents found"
              description={searchQuery ? "No documents match your search criteria." : "This repository doesn't have any documents yet, or they are nested in folders."}
              icon={<FileText className="h-8 w-8" />}
              actionText={searchQuery ? "Clear Search" : "Refresh"}
              onAction={searchQuery ? () => setSearchQuery('') : () => fetchFiles(true)}
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
                        Path
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
                    {filteredFiles.map((file) => (
                      <tr key={file.path} className="hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getFileIcon(file.content_type)}
                            <div className="ml-3 text-sm font-medium text-white truncate max-w-[200px]" title={file.name}>
                              {file.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-400 truncate max-w-[300px]" title={file.path}>{file.path}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-400">{file.content_type || 'Unknown'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-400">{formatFileSize(file.size)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-400">{new Date(file.modified_at).toLocaleString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <Button
                              onClick={() => handleDownload(file)}
                              variant="outline"
                              size="sm"
                              icon={<Download className="h-4 w-4" />}
                            >
                              Download
                            </Button>
                            <Button
                              onClick={() => window.location.href = `/search?q=${encodeURIComponent(file.name)}&repository=${selectedRepository}`}
                              variant="outline"
                              size="sm"
                              icon={<Search className="h-4 w-4" />}
                            >
                              Search
                            </Button>
                            <Button
                              onClick={() => handleDelete(file)}
                              variant="danger"
                              size="sm"
                              icon={<Trash2 className="h-4 w-4" />}
                              isLoading={isDeleting === file.path} // Show loading for this specific button
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

    export default Documents;
