import React, { useState, useEffect } from 'react';
// Add Database to the import from lucide-react
import { FileText, Search, Download, Trash2, RefreshCw, Database } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import { getRepositories, listRepositoryFiles, downloadFile, deleteFile } from '../api';
import { FileInfo } from '../types';
import toast from 'react-hot-toast';
import axios from 'axios'; // Import axios for error checking

const Documents: React.FC = () => {
  const [repositories, setRepositories] = useState<string[]>([]);
  const [selectedRepository, setSelectedRepository] = useState<string>('');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRepositories();
  }, []);

  useEffect(() => {
    if (selectedRepository) {
      fetchFiles();
    } else {
      setFiles([]); // Clear files if no repository is selected
      setLoading(false);
    }
  }, [selectedRepository]);

  useEffect(() => {
    filterFiles();
  }, [files, searchQuery]);

  const fetchRepositories = async () => {
    try {
      setError(null);
      const data = await getRepositories();
      setRepositories(data);
      if (data.length > 0 && !selectedRepository) {
        setSelectedRepository(data[0]); // Select first repo by default if none selected
      } else if (data.length === 0) {
        setSelectedRepository(''); // Clear selection if no repos exist
      }
    } catch (err) {
      setError('Failed to fetch repositories. Please check API connection.');
      toast.error('Failed to fetch repositories');
      console.error(err);
    }
  };

  const fetchFiles = async () => {
    if (!selectedRepository) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await listRepositoryFiles(selectedRepository);
      // Recursively get all files from all directories
      const allFiles = await getAllFiles(selectedRepository, data);
      setFiles(allFiles.sort((a, b) => a.path.localeCompare(b.path))); // Sort files by path
    } catch (err) {
      setError(`Failed to fetch files for "${selectedRepository}".`);
      toast.error(`Failed to fetch files for "${selectedRepository}"`);
      console.error(err);
      setFiles([]); // Clear files on error
    } finally {
      setLoading(false);
    }
  };

  // Keep getAllFiles as is, maybe add more specific error logging inside
  const getAllFiles = async (repository: string, items: FileInfo[]): Promise<FileInfo[]> => {
    let allFiles: FileInfo[] = [];
    
    for (const item of items) {
      if (item.is_directory) {
        try {
          const subItems = await listRepositoryFiles(repository, item.path);
          const subFiles = await getAllFiles(repository, subItems);
          allFiles = [...allFiles, ...subFiles];
        } catch (error) {
          console.error(`Error fetching files from directory ${item.path}:`, error);
          // Optionally add feedback about partial loading
          // toast.error(`Could not load files from ${item.name}`);
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
    try {
      const url = downloadFile(selectedRepository, file.path);
      window.open(url, '_blank');
    } catch (error) {
      toast.error(`Failed to initiate download for ${file.name}`);
      console.error("Download error:", error);
    }
  };

  const handleDelete = async (file: FileInfo) => {
    if (!selectedRepository) return;
    
    // Confirmation dialog
    if (!window.confirm(`Are you sure you want to delete "${file.name}"? This action cannot be undone.`)) {
      return;
    }

    const toastId = toast.loading(`Deleting "${file.name}"...`);
    try {
      await deleteFile(selectedRepository, file.path);
      toast.success(`File "${file.name}" deleted successfully`, { id: toastId });
      // Optimistic UI update or refetch
      setFiles(prevFiles => prevFiles.filter(f => f.path !== file.path));
      // fetchFiles(); // Alternatively, refetch all files
    } catch (error) {
      toast.error(`Failed to delete file "${file.name}"`, { id: toastId });
      console.error("Delete error:", error);
    }
  };

  const getFileIcon = (mimeType: string | null) => {
    // Consistent icon usage
    const className = "h-5 w-5 mr-3 flex-shrink-0";
    if (!mimeType) return <FileText className={`${className} text-gray-400`} />;
    
    if (mimeType.includes('pdf')) {
      return <FileText className={`${className} text-red-500`} />;
    } else if (mimeType.includes('word') || mimeType.includes('docx')) {
      return <FileText className={`${className} text-blue-500`} />;
    } else if (mimeType.includes('text')) {
      return <FileText className={`${className} text-gray-300`} />;
    }
    
    return <FileText className={`${className} text-gray-400`} />; // Default icon
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
            onClick={fetchFiles}
            variant="secondary"
            icon={<RefreshCw className="h-4 w-4" />}
            disabled={loading || !selectedRepository}
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
                className="block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm disabled:opacity-50"
                disabled={repositories.length === 0}
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
            </div>
            
            <div className="md:col-span-3">
              <label htmlFor="search" className="block text-sm font-medium text-white mb-1">
                Search Files
              </label>
              <SearchBar
                onSearch={handleSearch}
                placeholder="Search by filename or path..."
                className="w-full"
                initialValue={searchQuery}
              />
            </div>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      ) : error ? (
         <Card>
           <p className="text-center text-red-400">{error}</p>
         </Card>
      ) : !selectedRepository ? (
        <EmptyState
          title="No Repository Selected"
          description="Please select a repository from the dropdown above to view its documents."
          icon={<Database className="h-8 w-8" />} // Database icon is now imported
        />
      ) : filteredFiles.length === 0 ? (
        <EmptyState
          title="No documents found"
          description={searchQuery ? "No documents match your search criteria." : `The repository "${selectedRepository}" is empty or contains only empty folders.`}
          icon={<FileText className="h-8 w-8" />}
          actionText={searchQuery ? "Clear Search" : undefined}
          onAction={searchQuery ? () => setSearchQuery('') : undefined}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto table-responsive">
            {/* Added table-zebra class */}
            <table className="min-w-full divide-y divide-gray-700 table-zebra">
              <thead className="bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Path
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
              {/* Removed tbody background, handled by table-zebra */}
              <tbody className="divide-y divide-gray-700">
                {filteredFiles.map((file) => (
                  // Removed hover:bg-gray-50, handled by table-zebra
                  <tr key={file.path}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getFileIcon(file.content_type)}
                        <div className="text-sm font-medium text-white truncate max-w-[200px]" title={file.name}>
                          {file.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400 truncate max-w-[300px]" title={file.path}>{file.path}</div>
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400 truncate max-w-[150px]" title={file.content_type || 'Unknown'}>{file.content_type || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">{formatFileSize(file.size)}</div>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">{new Date(file.modified_at).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center space-x-2">
                        <Button
                          onClick={() => handleDownload(file)}
                          variant="outline"
                          size="sm"
                          icon={<Download className="h-4 w-4" />}
                          title={`Download ${file.name}`}
                        >
                          <span className="hidden sm:inline">Download</span>
                        </Button>
                        <Button
                          onClick={() => window.location.href = `/search?q=${encodeURIComponent(file.name)}&repository=${selectedRepository}`}
                          variant="outline"
                          size="sm"
                          icon={<Search className="h-4 w-4" />}
                          title={`Search related to ${file.name}`}
                        >
                          <span className="hidden sm:inline">Search</span>
                        </Button>
                        <Button
                          onClick={() => handleDelete(file)}
                          variant="danger"
                          size="sm"
                          icon={<Trash2 className="h-4 w-4" />}
                          title={`Delete ${file.name}`}
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
