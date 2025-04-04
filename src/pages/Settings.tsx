import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Database, Server, RefreshCw } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { checkHealth } from '../api';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<'loading' | 'healthy' | 'unhealthy'>('loading');
  const [healthDetails, setHealthDetails] = useState<any>(null);
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_URL || localStorage.getItem('apiUrl') || 'http://localhost:3001');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    checkApiHealth();
  }, []);

  const checkApiHealth = async () => {
    setHealthStatus('loading');
    try {
      const health = await checkHealth();
      setHealthStatus(health.status === 'healthy' ? 'healthy' : 'unhealthy');
      setHealthDetails(health);
    } catch (error) {
      setHealthStatus('unhealthy');
      toast.error('Failed to connect to API');
    }
  };

  const handleUpdateApiUrl = () => {
    setIsUpdating(true);
    
    try {
      // Store the API URL in localStorage
      localStorage.setItem('apiUrl', apiUrl);
      
      // Show success message
      toast.success('API URL updated. Reloading application...');
      
      // Reload the page after a short delay to allow the toast to be seen
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (error) {
      toast.error('Failed to update API URL');
      setIsUpdating(false);
    }
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
          >
            Check Connection
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="API Connection">
          <div className="space-y-4">
            <div className="flex items-center">
              <div className={`h-3 w-3 rounded-full mr-2 ${
                healthStatus === 'healthy' ? 'bg-green-500' : 
                healthStatus === 'unhealthy' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              <span className="text-sm font-medium text-white">
                Status: {healthStatus === 'loading' ? 'Checking...' : 
                  healthStatus === 'healthy' ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {healthDetails && (
              <div className="mt-4 p-4 bg-gray-800 rounded-md text-sm border border-gray-700">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-400">Vector DB Type:</div>
                  <div className="font-medium text-white">{healthDetails.vector_db_type}</div>
                  
                  <div className="text-gray-400">Vector DB URL:</div>
                  <div className="font-medium text-white">{healthDetails.vector_db_url}</div>
                  
                  <div className="text-gray-400">Qdrant Connection:</div>
                  <div className="font-medium text-white">{healthDetails.qdrant_connection}</div>
                </div>
              </div>
            )}
            
            <div className="mt-4">
              <label htmlFor="api-url" className="block text-sm font-medium text-white mb-1">
                API URL
              </label>
              <div className="flex">
                <input
                  type="text"
                  id="api-url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="flex-1 block w-full border border-gray-700 rounded-l-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm"
                  placeholder="http://localhost:3001"
                />
                <Button
                  onClick={handleUpdateApiUrl}
                  className="rounded-l-none"
                  isLoading={isUpdating}
                >
                  Update
                </Button>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Changes will take effect after page reload. Make sure the API is running at the specified URL.
              </p>
            </div>
          </div>
        </Card>

        <Card title="System Information">
          <div className="space-y-4">
            <div className="flex items-center">
              <Server className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium text-white">Final Moment Context API</span>
            </div>
            
            <div className="mt-4 p-4 bg-gray-800 rounded-md border border-gray-700">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-400">Version:</div>
                <div className="font-medium text-white">1.0.0</div>
                
                <div className="text-gray-400">Environment:</div>
                <div className="font-medium text-white">{import.meta.env.MODE}</div>
                
                <div className="text-gray-400">Client:</div>
                <div className="font-medium text-white">React {React.version}</div>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium text-white mb-2">Documentation</h4>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('/docs', '_blank')}
                >
                  API Docs
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://github.com/yourusername/final-moment-context-api', '_blank')}
                >
                  GitHub
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Vector Database">
          <div className="space-y-4">
            <div className="flex items-center">
              <Database className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium text-white">Qdrant Vector Database</span>
            </div>
            
            <div className="p-4 bg-gray-800 rounded-md text-sm border border-gray-700">
              <p className="text-white">
                The Final Moment Context API uses Qdrant as its vector database for storing and retrieving document embeddings.
              </p>
              <ul className="mt-2 list-disc list-inside text-gray-400 space-y-1">
                <li>Supports multiple distance metrics (Cosine, Dot, Euclid, Manhattan)</li>
                <li>Efficient semantic search capabilities</li>
                <li>Metadata filtering for precise results</li>
              </ul>
            </div>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium text-white mb-2">Qdrant Resources</h4>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://qdrant.tech/documentation/', '_blank')}
                >
                  Qdrant Docs
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(healthDetails?.vector_db_url || 'http://localhost:6333', '_blank')}
                >
                  Qdrant Dashboard
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card title="About Final Moment">
          <div className="space-y-4">
            <div className="flex items-center">
              <SettingsIcon className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium text-white">Final Moment Context API Dashboard</span>
            </div>
            
            <div className="p-4 bg-gray-800 rounded-md text-sm border border-gray-700">
              <p className="text-white">
                Final Moment Context API is designed to help medical professionals and researchers process, store, and search medical documents using semantic search technology.
              </p>
              <p className="mt-2 text-white">
                This dashboard provides a user-friendly interface to interact with the API, manage repositories, process documents, and perform semantic searches.
              </p>
            </div>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium text-white mb-2">Features</h4>
              <ul className="list-disc list-inside text-gray-400 space-y-1">
                <li>Document repository management</li>
                <li>Semantic search across medical documents</li>
                <li>Google Drive integration</li>
                <li>Multiple distance metrics for different search needs</li>
                <li>Batch processing of documents</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
