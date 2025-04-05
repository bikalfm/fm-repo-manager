import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Search as SearchIcon, FileText, Database, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import Card from '../components/Card';
import SearchBar from '../components/SearchBar';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState'; // <-- Import added here
import { getRepositories, searchContext } from '../api';
import { ContextResponse, DocumentChunk } from '../types';
import toast from 'react-hot-toast';
import axios from 'axios'; // Import axios for error checking

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRepositories();
    
    // Trigger search only if there's an initial query
    if (initialQuery) {
      handleSearch(initialQuery, initialRepo, maxChunks, distanceMetric); // Pass initial repo too
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  // Update state if URL params change externally (e.g., browser back/forward)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    const repo = params.get('repository') || '';
    setQuery(q);
    setRepository(repo);
    // Optionally re-trigger search if params change and differ from current results
    // This can be complex, might need debouncing or careful state comparison
  }, [location.search]);


  const fetchRepositories = async () => {
    try {
      const data = await getRepositories();
      setRepositories(data.sort()); // Sort repos
    } catch (err) {
      toast.error('Failed to fetch repositories');
      console.error(err);
    }
  };

  const handleSearch = async (
    searchQuery: string,
    repoToSearch: string = repository, // Use current state or passed value
    chunksToGet: number = maxChunks,
    metricToUse: string = distanceMetric
  ) => {
    if (!searchQuery.trim()) {
      setSearchResults(null); // Clear results if query is empty
      setError(null);
      updateUrlParams(searchQuery, repoToSearch); // Update URL even for empty query
      return;
    }
    
    setQuery(searchQuery); // Update query state immediately for input field
    setLoading(true);
    setError(null);
    setSearchResults(null); // Clear previous results
    const toastId = toast.loading(`Searching for "${searchQuery}"...`);
    
    try {
      const results = await searchContext(
        searchQuery,
        repoToSearch || undefined, // Pass undefined if "All" is selected
        chunksToGet,
        metricToUse
      );
      setSearchResults(results);
      if (results.chunks.length === 0) {
        toast.success('Search complete, but no relevant chunks found.', { id: toastId });
      } else {
         toast.success(`Found ${results.chunks.length} relevant chunks.`, { id: toastId });
      }
      updateUrlParams(searchQuery, repoToSearch); // Update URL on successful search
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown search error';
      setError(`Search failed: ${errorMessage}`);
      toast.error(`Search failed: ${errorMessage}`, { id: toastId });
      console.error(err);
      setSearchResults(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper to update URL without full page reload
  const updateUrlParams = (newQuery: string, newRepo: string) => {
    const params = new URLSearchParams(location.search);
    if (newQuery) {
      params.set('q', newQuery);
    } else {
      params.delete('q');
    }
    if (newRepo) {
      params.set('repository', newRepo);
    } else {
      params.delete('repository');
    }
    const newSearch = params.toString();
    // Use replaceState to avoid adding to browser history for every param change
    window.history.replaceState({}, '', `${location.pathname}${newSearch ? `?${newSearch}` : ''}`);
  };


  const handleRepositoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRepo = e.target.value;
    setRepository(newRepo);
    // Optionally trigger search immediately on repo change if there's a query
    if (query.trim()) {
      handleSearch(query, newRepo);
    } else {
      updateUrlParams(query, newRepo); // Just update URL if query is empty
    }
  };

  const handleDistanceMetricChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDistanceMetric(e.target.value);
    // Optionally re-trigger search on metric change if there's a query
    if (query.trim()) {
      handleSearch(query, repository, maxChunks, e.target.value);
    }
  };

  const handleMaxChunksChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = parseInt(e.target.value, 10);
    if (!isNaN(newMax) && newMax > 0) {
      setMaxChunks(newMax);
      // Optionally re-trigger search on max chunks change if there's a query
      if (query.trim()) {
        handleSearch(query, repository, newMax, distanceMetric);
      }
    }
  };

  // Wrapper for SearchBar's onSearch prop
  const triggerSearchFromBar = (searchQuery: string) => {
    handleSearch(searchQuery, repository, maxChunks, distanceMetric);
  };


  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-white sm:text-3xl sm:truncate">
            Semantic Document Search
          </h2>
        </div>
      </div>

      {/* Search Controls Card */}
      <Card className="mb-8">
        <div className="space-y-6">
          <SearchBar
            onSearch={triggerSearchFromBar} // Use the wrapper
            placeholder="Enter search query (e.g., patient symptoms, treatment options)..."
            initialValue={query}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="repository" className="block text-sm font-medium text-white mb-1">
                Repository Scope
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
                Similarity Metric
              </label>
              <select
                id="distance-metric"
                value={distanceMetric}
                onChange={handleDistanceMetricChange}
                className="block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm"
              >
                <option value="cosine">Cosine (Recommended)</option>
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
                max="50" // Increased max limit
                step="1"
                value={maxChunks}
                onChange={handleMaxChunksChange}
                className="block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Results Area */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      ) : error ? (
         <Card>
           <p className="text-center text-red-400">{error}</p>
         </Card>
      ) : searchResults ? (
        <div className="space-y-6">
          <div className="bg-gray-900 shadow rounded-lg overflow-hidden border border-gray-800">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-white flex items-center">
                <SearchIcon className="h-5 w-5 mr-2 text-white flex-shrink-0" />
                Search Results
              </h3>
              <div className="mt-2 text-sm text-gray-400">
                <p>
                  Found {searchResults.chunks.length} relevant chunk(s) for "<strong className="text-gray-200">{searchResults.query}</strong>"
                  {repository && ` in repository "${repository}"`}
                  . Using {searchResults.distance_metric_used} similarity.
                </p>
              </div>
            </div>
          </div>

          {searchResults.chunks.length > 0 ? (
            searchResults.chunks.map((chunk) => (
              <SearchResultCard key={chunk.id} chunk={chunk} />
            ))
          ) : (
             <EmptyState
               title="No Relevant Documents Found"
               description="Your search returned no results. Try refining your query or broadening the repository scope."
               icon={<FileText className="h-10 w-10" />}
             />
          )}
        </div>
      ) : initialQuery ? (
        // Show this only if there was an initial query but no results yet (e.g., on initial load error)
        <Card>
          <p className="text-center text-gray-400">Could not load initial search results.</p>
        </Card>
      ) : (
         // Initial state before any search
         <EmptyState
           title="Start Searching"
           description="Enter a query above to search across your document repositories using semantic understanding."
           icon={<SearchIcon className="h-10 w-10" />}
         />
      )}
    </div>
  );
};

// --- Search Result Card Component ---

interface SearchResultCardProps {
  chunk: DocumentChunk;
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({ chunk }) => {
  const [expanded, setExpanded] = useState(false);
  
  const toggleExpand = () => {
    setExpanded(!expanded);
  };
  
  // Improved source parsing, handles potential variations
  const getSourceInfo = (path: string): { filename: string; repo: string; fullPath: string } => {
    const defaultInfo = { filename: 'Unknown Source', repo: 'Unknown Repo', fullPath: path };
    if (!path) return defaultInfo;

    // Try splitting by '/repository_files/' which might be a common base
    const repoFilesSplit = path.split('/repository_files/');
    if (repoFilesSplit.length > 1) {
      const relativePath = repoFilesSplit[1];
      const parts = relativePath.split('/');
      if (parts.length > 0) {
        defaultInfo.repo = parts[0];
        defaultInfo.filename = parts[parts.length - 1];
        // Keep full path relative to repo root if possible
        defaultInfo.fullPath = parts.slice(1).join('/') || defaultInfo.filename;
        return defaultInfo;
      }
    }

    // Fallback: just take the last part as filename
    const parts = path.replace(/\\/g, '/').split('/'); // Normalize slashes
    defaultInfo.filename = parts[parts.length - 1] || defaultInfo.filename;
    // Try to guess repo name (less reliable)
    if (parts.length > 1) defaultInfo.repo = parts[parts.length - 2];

    return defaultInfo;
  };

  const { filename, repo, fullPath } = getSourceInfo(chunk.source);
  const repoFilePath = fullPath.startsWith(filename) ? filename : `${repo}/${fullPath}`; // Construct a display path

  return (
    <Card className="transition duration-200 ease-in-out hover:shadow-lg-dark">
      <div className="space-y-4">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="flex items-start min-w-0">
            <FileText className="h-5 w-5 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
            <div className="min-w-0">
              <h4 className="text-md font-medium text-white truncate" title={filename}>
                {filename}
              </h4>
              <div className="flex items-center mt-1 text-xs text-gray-400">
                <Database className="h-3 w-3 mr-1 flex-shrink-0" />
                <Link
                  to={`/repositories/${repo}/${fullPath.substring(0, fullPath.lastIndexOf('/'))}`} // Link to folder containing the file
                  className="hover:text-white hover:underline truncate"
                  title={`In repository: ${repo}, Path: ${fullPath}`}
                >
                  {repo} / {fullPath.length > 30 ? '...' + fullPath.slice(-27) : fullPath}
                </Link>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 mt-2 sm:mt-0 sm:ml-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-white border border-gray-700 whitespace-nowrap">
              Score: {(chunk.relevance_score * 100).toFixed(1)}%
            </span>
          </div>
        </div>
        
        {/* Content Section */}
        <div className={`text-sm text-gray-300 prose prose-invert prose-sm max-w-none ${expanded ? '' : 'line-clamp-4'}`}>
          {/* Use dangerouslySetInnerHTML cautiously if highlighting is needed, otherwise render plain text */}
          {chunk.content}
        </div>
        
        {/* Footer Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-gray-700">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleExpand}
            icon={expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          >
            {expanded ? 'Show Less' : 'Show More'}
          </Button>
          
          {/* Optional: Link to view the full document if possible */}
          {/* <Link to={`/documents?repo=${repo}&path=${fullPath}`}>
             <Button variant="outline" size="sm" icon={<ExternalLink className="h-4 w-4" />}>View Full Document</Button>
          </Link> */}

          <div className="text-xs text-gray-500 self-end sm:self-center" title={`Chunk ID: ${chunk.id}`}>
            ID: {chunk.id.substring(0, 8)}...
          </div>
        </div>

        {/* Expanded Metadata (Optional) */}
        {expanded && chunk.metadata && Object.keys(chunk.metadata).length > 0 && (
          <div className="pt-3 border-t border-gray-700">
            <h5 className="text-xs font-semibold text-gray-400 uppercase mb-2">Metadata</h5>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {Object.entries(chunk.metadata).map(([key, value]) => (
                <div key={key} className="flex">
                  <dt className="font-medium text-gray-500 w-20 flex-shrink-0 truncate" title={key}>{key}:</dt>
                  <dd className="text-gray-300 truncate" title={String(value)}>{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </Card>
  );
};

export default Search;
