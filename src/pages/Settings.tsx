import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Database, Server, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react'; // Added icons
import Card from '../components/Card';
import Button from '../components/Button';
import { checkHealth } from '../api';
import toast from 'react-hot-toast';
import axios from 'axios';

const Settings: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<'loading' | 'healthy' | 'unhealthy'>('loading');
  const [healthDetails, setHealthDetails] = useState<any>(null);
  const defaultApiUrl = import.meta.env.VITE_API_URL || 'https://finalmoment-context-api-1022652397153.us-central1.run.app/';
  const [apiUrl, setApiUrl] = useState(localStorage.getItem('apiUrl') || defaultApiUrl);
  const [isUpdating, setIsUpdating] = useState(false);
  const [apiUrlChanged, setApiUrlChanged] = useState(false);

  useEffect(() => {
    checkApiHealth();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  useEffect(() => {
    // Track if the URL input differs from the currently saved/default URL
    const currentStoredUrl = localStorage.getItem('apiUrl') || defaultApiUrl;
    setApiUrlChanged(apiUrl !== currentStoredUrl);
  }, [apiUrl, defaultApiUrl]);

  const checkApiHealth = async () => {
    setHealthStatus('loading');
    setHealthDetails(null);
    const toastId = toast.loading('Checking API connection...');
    try {
      const health = await checkHealth();
      if (health && health.status === 'healthy') {
        setHealthStatus('healthy');
        setHealthDetails(health);
        toast.success('API Connection Successful', { id: toastId });
      } else {
        setHealthStatus('unhealthy');
        setHealthDetails(health);
        toast.error(`API Unhealthy: ${health?.message || 'Status not healthy'}`, { id: toastId });
      }
    } catch (error) {
      setHealthStatus('unhealthy');
      let errorMessage = 'API Connection Failed.';
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          errorMessage = 'API Connection Failed: Request timed out.';
        } else if (error.response) {
          errorMessage = `API Error: ${error.response.status} - ${error.response.data?.detail || error.message}`;
        } else if (error.request) {
          errorMessage = 'API Connection Failed: No response from server.';
        } else {
          errorMessage = `API Request Error: ${error.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = `Connection Error: ${error.message}`;
      }
      toast.error(errorMessage, { id: toastId });
      console.error("API Health Check Error:", error);
    }
  };


  const handleUpdateApiUrl = () => {
    let urlToSave = apiUrl.trim();
    if (!urlToSave) {
      toast.error('API URL cannot be empty.');
      return;
    }
    // Ensure trailing slash
    if (!urlToSave.endsWith('/')) {
      urlToSave += '/';
      setApiUrl(urlToSave); // Update state visually as well
    }

    try {
      new URL(urlToSave); // Validate URL format
    } catch (_) {
      toast.error('Invalid URL format. Please include http:// or https://');
      return;
    }

    setIsUpdating(true);
    try {
      localStorage.setItem('apiUrl', urlToSave);
      toast.success('API URL updated. Reloading application...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error updating API URL:", error);
      toast.error('Failed to save API URL to local storage.');
      setIsUpdating(false);
    }
  };

  const renderHealthDetail = (label: string, value: any, isStatus: boolean = false) => {
    let statusIcon = null;
    let valueClass = 'text-white';

    if (isStatus) {
      if (value === 'OK' || value === 'healthy') {
        statusIcon = <CheckCircle className="h-4 w-4 text-green-400 mr-1 flex-shrink-0" />;
        valueClass = 'text-green-400';
      } else if (value && value !== 'N/A') {
        statusIcon = <AlertTriangle className="h-4 w-4 text-red-400 mr-1 flex-shrink-0" />;
        valueClass = 'text-red-400';
      }
    }

    const displayValue = value === null || value === undefined ? 'N/A' : String(value);

    return (
      <React.Fragment key={label}>
        <div className="text-gray-400 truncate" title={label}>{label}:</div>
        <div className={`font-medium ${valueClass} flex items-center truncate`} title={displayValue}>
          {statusIcon}
          <span className="truncate">{displayValue}</span>
        </div>
      </React.Fragment>
    );
  };

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-white sm:text-3xl sm:truncate">
            Settings
          </h2>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Button
            onClick={checkApiHealth}
            variant="secondary"
            icon={<RefreshCw className="h-4 w-4" />}
            disabled={healthStatus === 'loading'}
            isLoading={healthStatus === 'loading'}
          >
            Check Connection
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* API Connection Card */}
        <Card title="API Connection">
          <div className="space-y-4">
            <div className="flex items-center">
              <div className={`h-3 w-3 rounded-full mr-2 flex-shrink-0 ${
                healthStatus === 'healthy' ? 'bg-green-500 animate-pulse' : 
                healthStatus === 'unhealthy' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              <span className="text-sm font-medium text-white">
                Status: {healthStatus === 'loading' ? 'Checking...' : 
                  healthStatus === 'healthy' ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {/* Health Details Section */}
            {healthDetails && (
              <div className="mt-4 p-4 bg-gray-800 rounded-md text-sm border border-gray-700">
                <h4 className="font-medium text-white mb-2">API Health Details:</h4>
                <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
                  {renderHealthDetail('API Status', healthDetails.status, true)}
                  {renderHealthDetail('Vector DB Type', healthDetails.vector_db_type)}
                  {renderHealthDetail('Vector DB URL', healthDetails.vector_db_url)}
                  {renderHealthDetail('Qdrant Connection', healthDetails.qdrant_connection, true)}
                  {renderHealthDetail('Redis Connection', healthDetails.redis_connection, true)}
                  {/* Add more details dynamically if they exist */}
                  {Object.entries(healthDetails)
                     .filter(([key]) => !['status', 'vector_db_type', 'vector_db_url', 'qdrant_connection', 'redis_connection'].includes(key))
                     .map(([key, value]) => renderHealthDetail(key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value))
                  }
                </div>
              </div>
            )}
            
            {/* API URL Input */}
            <div className="mt-4">
              <label htmlFor="api-url" className="block text-sm font-medium text-white mb-1">
                API URL
              </label>
              <div className="flex">
                <input
                  type="url"
                  id="api-url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="flex-1 block w-full border border-gray-700 rounded-l-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm disabled:opacity-50"
                  placeholder="https://your-api-endpoint.com/"
                  disabled={isUpdating}
                  spellCheck="false"
                />
                <Button
                  onClick={handleUpdateApiUrl}
                  className="rounded-l-none"
                  isLoading={isUpdating}
                  // Disable if updating or if the URL hasn't changed from the stored/default value
                  disabled={isUpdating || !apiUrlChanged}
                >
                  Update & Reload
                </Button>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Enter the base URL for the API. Ensure it ends with a slash (/). Requires page reload.
              </p>
            </div>
          </div>
        </Card>

        {/* System Information Card */}
        <Card title="System Information">
          <div className="space-y-4">
            <div className="flex items-center">
              <Server className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium text-white">Final Moment Context Manager</span>
            </div>
            
            <div className="mt-4 p-4 bg-gray-800 rounded-md border border-gray-700">
              <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
                {renderHealthDetail('UI Version', '1.0.0')}
                {renderHealthDetail('UI Environment', import.meta.env.MODE)}
                {renderHealthDetail('React Version', React.version)}
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium text-white mb-2">Documentation & Links</h4>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="sm" disabled>API Docs (TBD)</Button>
                <Button variant="outline" size="sm" disabled>GitHub Repo (TBD)</Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Vector Database Card */}
        <Card title="Vector Database Info">
          <div className="space-y-4">
            <div className="flex items-center">
              <Database className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium text-white">{healthDetails?.vector_db_type || 'Vector DB'}</span>
            </div>
            
            <div className="p-4 bg-gray-800 rounded-md text-sm border border-gray-700">
              <p className="text-white">
                The API utilizes a vector database for storing document embeddings and enabling semantic search.
              </p>
              <ul className="mt-2 list-disc list-inside text-gray-400 space-y-1">
                <li>Stores text chunks as high-dimensional vectors.</li>
                <li>Enables searching based on meaning, not just keywords.</li>
                <li>Supports various similarity metrics.</li>
              </ul>
            </div>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium text-white mb-2">Database Resources</h4>
              <div className="flex flex-wrap gap-3">
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={() => window.open('https://qdrant.tech/documentation/', '_blank')}
                   disabled={!healthDetails?.vector_db_type?.toLowerCase().includes('qdrant')}
                 >
                   Qdrant Docs
                 </Button>
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={() => window.open(healthDetails?.vector_db_url || '#', '_blank')}
                   disabled={!healthDetails?.vector_db_url}
                 >
                   DB Dashboard
                 </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* About Card */}
        <Card title="About This Application">
          <div className="space-y-4">
            <div className="flex items-center">
              <SettingsIcon className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium text-white">Context Manager Dashboard</span>
            </div>
            
            <div className="p-4 bg-gray-800 rounded-md text-sm border border-gray-700">
              <p className="text-white">
                This dashboard provides an interface to interact with the Final Moment Context API for managing and searching document repositories.
              </p>
            </div>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium text-white mb-2">Key Features</h4>
              <ul className="list-disc list-inside text-gray-400 space-y-1 text-sm">
                <li>Repository creation and deletion</li>
                <li>File/folder management within repositories</li>
                <li>Document uploading & background processing</li>
                <li>Semantic search across single or all repositories</li>
                <li>Google Drive integration (syncing and processing)</li>
                <li>Configurable API endpoint</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
