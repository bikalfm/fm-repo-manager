import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search as SearchIcon, FileText, Database } from 'lucide-react';
import Card from '../components/Card';
import SearchBar from '../components/SearchBar';
import Button from '../components/Button';
import { getRepositories, searchContext } from '../api';
import { ContextResponse, DocumentChunk } from '../types';
import toast from 'react-hot-toast';

const Search: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialQuery = queryParams.get('q') || '';
  const initialRepo = queryParams.get('repository') || '';

  const [query, setQuery] = useState(initialQuery);
  const [repository, setRepository] = useState(initialRepo);
  const [repositories, setRepositories] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<ContextResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [distanceMetric, setDistanceMetric] = useState('cosine');
  const [maxChunks, setMaxChunks] = useState(5);

  useEffect(() => {
    fetchRepositories();
    
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery, initialRepo]);

  const fetchRepositories = async () => {
    try {
      const data = await getRepositories();
      setRepositories(data);
    } catch (error) {
      toast.error('Failed to fetch repositories');
    }
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setQuery(searchQuery);
    setLoading(true);
    
    try {
      const results = await searchContext(
        searchQuery,
        repository || undefined,
        maxChunks,
        distanceMetric
      );
      setSearchResults(results);
      
      // Update URL with search parameters
      const params = new URLSearchParams();
      params.set('q', searchQuery);
      if (repository) params.set('repository', repository);
      window.history.replaceState({}, '', `${location.pathname}?${params.toString()}`);
    } catch (error) {
      toast.error('Search failed');
      setSearchResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRepositoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRepository(e.target.value);
  };

  const handleDistanceMetricChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDistanceMetric(e.target.value);
  };

  const handleMaxChunksChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMaxChunks(parseInt(e.target.value, 10));
  };

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-white sm:text-3xl sm:truncate">
            Search Documents
          </h2>
        </div>
      </div>

      <Card className="mb-8">
        <div className="space-y-6">
          <SearchBar
            onSearch={handleSearch}
            placeholder="Search for medical terms, treatments, diagnoses..."
            initialValue={query}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="repository" className="block text-sm font-medium text-white mb-1">
                Repository
              </label>
              <select
                id="repository"
                value={repository}
                onChange={handleRepositoryChange}
                className="block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm"
              >
                <option value="">All Repositories</option>
                {repositories.map((repo) => (
                  <option key={repo} value={repo}>{repo}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="distance-metric" className="block text-sm font-medium text-white mb-1">
                Distance Metric
              </label>
              <select
                id="distance-metric"
                value={distanceMetric}
                onChange={handleDistanceMetricChange}
                className="block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm"
              >
                <option value="cosine">Cosine</option>
                <option value="dot">Dot Product</option>
                <option value="euclid">Euclidean</option>
                <option value="manhattan">Manhattan</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="max-chunks" className="block text-sm font-medium text-white mb-1">
                Max Results
              </label>
              <input
                id="max-chunks"
                type="number"
                min="1"
                max="20"
                value={maxChunks}
                onChange={handleMaxChunksChange}
                className="block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm"
              />
            </div>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      ) : searchResults ? (
        <div className="space-y-6">
          <div className="bg-gray-900 shadow rounded-lg overflow-hidden border border-gray-800">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-white flex items-center">
                <SearchIcon className="h-5 w-5 mr-2 text-white" />
                Search Results
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-400">
                <p>
                  Found {searchResults.total_chunks} results for "{searchResults.query}" using {searchResults.distance_metric_used} similarity.
                </p>
              </div>
            </div>
          </div>

          {searchResults.chunks.map((chunk) => (
            <SearchResultCard key={chunk.id} chunk={chunk} />
          ))}
        </div>
      ) : query ? (
        <div className="bg-gray-900 shadow rounded-lg overflow-hidden border border-gray-800">
          <div className="px-4 py-5 sm:p-6 text-center">
            <h3 className="text-lg leading-6 font-medium text-white">No results found</h3>
            <p className="mt-2 text-sm text-gray-400">
              Try adjusting your search terms or selecting a different repository.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

interface SearchResultCardProps {
  chunk: DocumentChunk;
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({ chunk }) => {
  const [expanded, setExpanded] = useState(false);
  
  const toggleExpand = () => {
    setExpanded(!expanded);
  };
  
  const getSourceFilename = (path: string) => {
    const parts = path.split('/');
    return parts[parts.length - 1];
  };
  
  const getRepositoryName = (path: string) => {
    const parts = path.split('/');
    // Assuming path format: /app/repository_files/{repository_name}/...
    return parts.length >= 4 ? parts[3] : 'Unknown';
  };
  
  return (
    <Card className="hover:shadow-lg hover:shadow-gray-700 transition-shadow">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <FileText className="h-5 w-5 text-white mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h4 className="text-md font-medium text-white">
                {getSourceFilename(chunk.source)}
              </h4>
              <div className="flex items-center mt-1">
                <Database className="h-4 w-4 text-gray-400 mr-1" />
                <span className="text-xs text-gray-400">
                  {getRepositoryName(chunk.source)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-white border border-gray-700">
              {(chunk.relevance_score * 100).toFixed(0)}% match
            </span>
          </div>
        </div>
        
        <div className={`text-sm text-gray-300 ${expanded ? '' : 'line-clamp-3'}`}>
          {chunk.content}
        </div>
        
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleExpand}
          >
            {expanded ? 'Show Less' : 'Show More'}
          </Button>
          
          <div className="text-xs text-gray-500">
            ID: {chunk.id.substring(0, 8)}...
          </div>
        </div>
      </div>
    </Card>
  );
};

export default Search;
