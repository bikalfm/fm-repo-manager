import React, { useState, useEffect } from 'react';
import { FileText, Search, Download, Trash2, RefreshCw } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import { getRepositories, listRepositoryFiles, downloadFile, deleteFile } from '../api';
import { FileInfo } from '../types';
import toast from 'react-hot-toast';

const Documents: React.FC = () => {
  const [repositories, setRepositories] = useState<string[]>([]);
  const [selectedRepository, setSelectedRepository] = useState<string>('');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRepositories();
  }, []);

  useEffect(() => {
    if (selectedRepository) {
      fetchFiles();
    }
  }, [selectedRepository]);

  useEffect(() => {
    filterFiles();
  }, [files, searchQuery]);

  const fetchRepositories = async () => {
    try {
      const data = await getRepositories();
      setRepositories(data);
      if (data.length > 0) {
        setSelectedRepository(data[0]);
      }
    } catch (error) {
      toast.error('Failed to fetch repositories');
    }
  };

  const fetchFiles = async () => {
    if (!selectedRepository) return;
    
    setLoading(true);
    try {
      const data = await listRepositoryFiles(selectedRepository);
      // Recursively get all files from all directories
      const allFiles = await getAllFiles(selectedRepository, data);
      setFiles(allFiles);
    } catch (error) {
      toast.error('Failed to fetch files');
    } finally {
      setLoading(false);
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
    
    try {
      await deleteFile(selectedRepository, file.path);
      toast.success(`File "${file.name}" deleted successfully`);
      fetchFiles();
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <FileText className="h-5 w-5 text-blue-500" />;
    
    if (mimeType.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else if (mimeType.includes('word') || mimeType.includes('docx')) {
      return <FileText className="h-5 w-5 text-blue-500" />;
    } else if (mimeType.includes('text')) {
      return <FileText className="h-5 w-5 text-gray-500" />;
    }
    
    return <FileText className="h-5 w-5 text-blue-500" />;
  };

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Documents
          </h2>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
          <Button
            onClick={fetchFiles}
            variant="secondary"
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      <Card className="mb-8">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <label htmlFor="repository" className="block text-sm font-medium text-gray-700 mb-1">
                Repository
              </label>
              <select
                id="repository"
                value={selectedRepository}
                onChange={handleRepositoryChange}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {repositories.map((repo) => (
                  <option key={repo} value={repo}>{repo}</option>
                ))}
              </select>
            </div>
            
            <div className="md:col-span-3">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
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
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredFiles.length === 0 ? (
        <EmptyState
          title="No documents found"
          description={searchQuery ? "No documents match your search criteria." : "This repository doesn't have any documents yet."}
          icon={<FileText className="h-8 w-8" />}
          actionText={searchQuery ? "Clear Search" : "Refresh"}
          onAction={searchQuery ? () => setSearchQuery('') : fetchFiles}
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
                    Path
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
                {filteredFiles.map((file) => (
                  <tr key={file.path} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getFileIcon(file.content_type)}
                        <div className="ml-3 text-sm font-medium text-gray-900">
                          {file.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{file.path}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{file.content_type || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatFileSize(file.size)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{new Date(file.modified_at).toLocaleString()}</div>
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
