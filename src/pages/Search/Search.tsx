import React, { useState, useEffect, useCallback } from 'react';
    import { useLocation, useNavigate } from 'react-router-dom';
    import { Search as SearchIcon, FileText, Database } from 'lucide-react';
    import Card from '../../components/Card';
    import SearchBar from '../../components/SearchBar';
    import Button from '../../components/Button';
    import Spinner from '../../components/Spinner';
    import { getRepositories, searchContext } from '../../api';
    import { ContextResponse, DocumentChunk } from '../../types';
    import toast from 'react-hot-toast';
    import MultiSelectDropdown from '../../components/MultiSelectDropdown';

    const Search: React.FC = () => {
      const location = useLocation();
      const navigate = useNavigate();
      const queryParams = new URLSearchParams(location.search);
      const initialQuery = queryParams.get('q') || '';
      const initialRepos = queryParams.getAll('repository') || [];

      const [query, setQuery] = useState(initialQuery);
      const [selectedRepositories, setSelectedRepositories] = useState<string[]>(initialRepos);
      const [availableRepositories, setAvailableRepositories] = useState<string[]>([]);
      const [searchResults, setSearchResults] = useState<ContextResponse | null>(null);
      const [loading, setLoading] = useState(false);
      const [distanceMetric, setDistanceMetric] = useState('cosine');
      const [maxChunks, setMaxChunks] = useState(5);

      const fetchAvailableRepositories = async () => {
        try {
          const data = await getRepositories();
          setAvailableRepositories(data);
        } catch (error) {
          toast.error('Failed to fetch repositories');
        }
      };

      const updateURL = useCallback((searchQuery: string, repos: string[]) => {
        const params = new URLSearchParams();
        params.set('q', searchQuery);
        repos.forEach(repo => params.append('repository', repo));
        // Add other params like distanceMetric, maxChunks if desired in URL
        navigate(`${location.pathname}?${params.toString()}`, { replace: true });
      }, [location.pathname, navigate]);

      const handleSearch = useCallback(async (searchQuery: string, isInitialLoad = false) => {
        if (!searchQuery.trim()) {
          setSearchResults(null);
          if (!isInitialLoad) updateURL(searchQuery, selectedRepositories);
          return;
        }

        setQuery(searchQuery);
        setLoading(true);
        setSearchResults(null);

        try {
          let combinedResults: DocumentChunk[] = [];
          let totalChunksFound = 0;

          if (selectedRepositories.length === 0) { // Search all repositories
            const results = await searchContext(
              searchQuery,
              undefined, // No specific repository
              maxChunks * 5, // Fetch more initially if searching all, then limit
              distanceMetric
            );
            combinedResults = results.chunks;
            totalChunksFound = results.total_chunks;
          } else { // Search selected repositories
            const promises = selectedRepositories.map(repo =>
              searchContext(
                searchQuery,
                repo,
                maxChunks * 2, // Fetch a bit more per repo then limit
                distanceMetric
              )
            );
            const resultsArray = await Promise.all(promises);
            resultsArray.forEach(res => {
              combinedResults.push(...res.chunks);
              totalChunksFound += res.total_chunks;
            });
          }

          // Sort all collected chunks by relevance score
          combinedResults.sort((a, b) => b.relevance_score - a.relevance_score);

          // Limit to maxChunks
          const finalChunks = combinedResults.slice(0, maxChunks);

          setSearchResults({
            query: searchQuery,
            chunks: finalChunks,
            total_chunks: totalChunksFound, // This is the total before client-side slicing for display
            distance_metric_used: distanceMetric,
          });

          if (!isInitialLoad) {
            updateURL(searchQuery, selectedRepositories);
          }
        } catch (error) {
          toast.error('Search failed');
          setSearchResults(null);
        } finally {
          setLoading(false);
        }
      }, [selectedRepositories, maxChunks, distanceMetric, updateURL]);


      useEffect(() => {
        fetchAvailableRepositories();
        if (initialQuery) {
          handleSearch(initialQuery, true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []); // Initial fetch and search on load

      // Listen for browser back/forward navigation
      useEffect(() => {
        const handlePopState = () => {
          const params = new URLSearchParams(window.location.search);
          const q = params.get('q') || '';
          const repos = params.getAll('repository') || [];
          setQuery(q);
          setSelectedRepositories(repos);
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
      }, [handleSearch]); // handleSearch is memoized
      
      const handleSelectedRepositoriesChange = (newSelectedRepos: string[]) => {
        setSelectedRepositories(newSelectedRepos);
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

          {/* The overflow-visible here is important for the dropdown to escape the card bounds */}
          <Card className="mb-8 overflow-visible"> 
            <div className="space-y-6">
              <SearchBar
                onSearch={(sq) => handleSearch(sq, false)}
                placeholder="Search for medical terms, treatments, diagnoses..."
                initialValue={query}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <MultiSelectDropdown
                    label="Repositories"
                    options={availableRepositories}
                    selectedOptions={selectedRepositories}
                    onChange={handleSelectedRepositoriesChange}
                    placeholder="Select repositories..."
                  />
                   <p className="mt-1 text-xs text-gray-400">
                    {selectedRepositories.length === 0 ? "Searching all repositories." : 
                     selectedRepositories.length === 1 ? `Selected: ${selectedRepositories[0]}` :
                     `${selectedRepositories.length} repositories selected.`
                    }
                  </p>
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
                    max="50" 
                    value={maxChunks}
                    onChange={handleMaxChunksChange}
                    className="block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </Card>

          {loading ? (
            <Spinner className="py-12" />
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
                      Displaying {searchResults.chunks.length} most relevant results (out of {searchResults.total_chunks} found) for "{searchResults.query}" using {searchResults.distance_metric_used} similarity.
                      {selectedRepositories.length > 0 && ` Searched in: ${selectedRepositories.join(', ')}.`}
                      {selectedRepositories.length === 0 && ` Searched in all available repositories.`}
                    </p>
                  </div>
                </div>
              </div>

              {searchResults.chunks.length > 0 ? (
                 searchResults.chunks.map((chunk) => (
                  <SearchResultCard key={chunk.id + chunk.source} chunk={chunk} /> 
                ))
              ) : (
                 <div className="bg-gray-900 shadow rounded-lg overflow-hidden border border-gray-800">
                    <div className="px-4 py-5 sm:p-6 text-center">
                      <h3 className="text-lg leading-6 font-medium text-white">No results found</h3>
                      <p className="mt-2 text-sm text-gray-400">
                        Try adjusting your search terms or selected repositories.
                      </p>
                    </div>
                  </div>
              )}
            </div>
          ) : query && !loading ? (
            <div className="bg-gray-900 shadow rounded-lg overflow-hidden border border-gray-800">
              <div className="px-4 py-5 sm:p-6 text-center">
                <h3 className="text-lg leading-6 font-medium text-white">No results found</h3>
                <p className="mt-2 text-sm text-gray-400">
                  Try adjusting your search terms or selected repositories.
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
        const normalizedPath = path.replace(/\\/g, '/');
        const parts = normalizedPath.split('/');
        return parts[parts.length - 1];
      };

      const getRepositoryName = (path: string) => {
        const normalizedPath = path.replace(/\\/g, '/');
        const parts = normalizedPath.split('/');
        const repoFilesIndex = parts.indexOf('repository_files');
        if (repoFilesIndex !== -1 && repoFilesIndex + 1 < parts.length) {
          return parts[repoFilesIndex + 1];
        }
        if (parts.length > 1) return parts[0]; 
        return 'Unknown Repository';
      };

      return (
        <Card className="hover:shadow-lg hover:shadow-gray-700 transition-shadow">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start min-w-0 mr-4">
                <FileText className="h-5 w-5 text-white mt-0.5 mr-2 flex-shrink-0" />
                <div className="min-w-0">
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
              <div className="flex-shrink-0">
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
