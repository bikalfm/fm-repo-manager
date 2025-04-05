import React, { useState, useEffect } from 'react';
    import { useLocation } from 'react-router-dom';
    import { Search as SearchIcon, FileText, Database } from 'lucide-react';
    import Card from '../../components/Card'; // Adjusted import path
    import SearchBar from '../../components/SearchBar'; // Adjusted import path
    import Button from '../../components/Button'; // Adjusted import path
    import Spinner from '../../components/Spinner'; // Adjusted import path
    import { getRepositories, searchContext } from '../../api'; // Adjusted import path
    import { ContextResponse, DocumentChunk } from '../../types'; // Adjusted import path
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
      const [loading, setLoading] = useState(false); // For search operation
      const [distanceMetric, setDistanceMetric] = useState('cosine');
      const [maxChunks, setMaxChunks] = useState(5);

      useEffect(() => {
        fetchRepositories();

        if (initialQuery) {
          handleSearch(initialQuery, true); // Pass flag to skip URL update on initial load
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []); // Run only on mount

      const fetchRepositories = async () => {
        try {
          const data = await getRepositories();
          setRepositories(data);
        } catch (error) {
          toast.error('Failed to fetch repositories');
        }
      };

      const handleSearch = async (searchQuery: string, isInitialLoad = false) => {
        if (!searchQuery.trim()) return;

        setQuery(searchQuery); // Update internal query state
        setLoading(true);
        setSearchResults(null); // Clear previous results

        try {
          const results = await searchContext(
            searchQuery,
            repository || undefined,
            maxChunks,
            distanceMetric
          );
          setSearchResults(results);

          // Update URL only if it's not the initial load based on URL params
          if (!isInitialLoad) {
            const params = new URLSearchParams();
            params.set('q', searchQuery);
            if (repository) params.set('repository', repository);
            // Use pushState to allow back navigation to previous search states
            window.history.pushState({}, '', `${location.pathname}?${params.toString()}`);
          }
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

      // Listen for browser back/forward navigation
      useEffect(() => {
        const handlePopState = () => {
          const params = new URLSearchParams(window.location.search);
          const q = params.get('q') || '';
          const repo = params.get('repository') || '';
          setQuery(q);
          setRepository(repo);
          if (q) {
            handleSearch(q, true); // Rerun search without updating history again
          } else {
            setSearchResults(null); // Clear results if query is empty
          }
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
          window.removeEventListener('popstate', handlePopState);
        };
         // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [repository, maxChunks, distanceMetric]); // Re-add listener if dependencies change

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
              {/* Pass loading state to SearchBar if you want to disable it during search */}
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
            <Spinner className="py-12" /> // Use Spinner component
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

              {searchResults.chunks.length > 0 ? (
                 searchResults.chunks.map((chunk) => (
                  <SearchResultCard key={chunk.id} chunk={chunk} />
                ))
              ) : (
                 <div className="bg-gray-900 shadow rounded-lg overflow-hidden border border-gray-800">
                    <div className="px-4 py-5 sm:p-6 text-center">
                      <h3 className="text-lg leading-6 font-medium text-white">No results found</h3>
                      <p className="mt-2 text-sm text-gray-400">
                        Try adjusting your search terms or selecting a different repository.
                      </p>
                    </div>
                  </div>
              )}
            </div>
          ) : query && !loading ? ( // Show 'No results' only if a search was performed and finished
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
        // Handle potential Windows paths and normalize separators
        const normalizedPath = path.replace(/\\/g, '/');
        const parts = normalizedPath.split('/');
        return parts[parts.length - 1];
      };

      const getRepositoryName = (path: string) => {
         // Handle potential Windows paths and normalize separators
        const normalizedPath = path.replace(/\\/g, '/');
        const parts = normalizedPath.split('/');
        // Adjust index based on expected path structure from the API
        // Example: /app/repository_files/{repository_name}/... -> index 3
        // Example: C:\data\repository_files\{repository_name}\... -> index 3 after split
        // Find the index of 'repository_files' and take the next part
        const repoFilesIndex = parts.indexOf('repository_files');
        if (repoFilesIndex !== -1 && repoFilesIndex + 1 < parts.length) {
          return parts[repoFilesIndex + 1];
        }
        // Fallback or alternative structure handling
        return 'Unknown';
      };

      return (
        <Card className="hover:shadow-lg hover:shadow-gray-700 transition-shadow">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start min-w-0 mr-4"> {/* Added min-w-0 and mr-4 */}
                <FileText className="h-5 w-5 text-white mt-0.5 mr-2 flex-shrink-0" />
                <div className="min-w-0"> {/* Added min-w-0 */}
                  <h4 className="text-md font-medium text-white truncate" title={getSourceFilename(chunk.source)}>
                    {getSourceFilename(chunk.source)}
                  </h4>
                  <div className="flex items-center mt-1">
                    <Database className="h-4 w-4 text-gray-400 mr-1 flex-shrink-0" />
                    <span className="text-xs text-gray-400 truncate" title={getRepositoryName(chunk.source)}>
                      {getRepositoryName(chunk.source)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0"> {/* Prevent score from wrapping */}
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
