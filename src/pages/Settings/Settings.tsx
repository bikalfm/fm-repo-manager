import React, { useState, useEffect } from 'react';
    import { Settings as SettingsIcon, Database, Server, RefreshCw } from 'lucide-react';
    import Card from '../../components/Card'; // Adjusted import path
    import Button from '../../components/Button'; // Adjusted import path
    import Spinner from '../../components/Spinner'; // Adjusted import path
    import { checkHealth } from '../../api'; // Adjusted import path
    import toast from 'react-hot-toast';
    import axios from 'axios'; // Import axios for temporary API instance creation

    const Settings: React.FC = () => {
      const [healthStatus, setHealthStatus] = useState<'loading' | 'healthy' | 'unhealthy'>('loading');
      const [healthDetails, setHealthDetails] = useState<any>(null);
      const [apiUrl, setApiUrl] = useState(localStorage.getItem('apiUrl') || import.meta.env.VITE_API_URL || 'https://fm-context-api-v1-1022652397153.us-central1.run.app/');
      const [isUpdating, setIsUpdating] = useState(false);
      const [isChecking, setIsChecking] = useState(false); // State for check connection button

      useEffect(() => {
        checkApiHealth();
         // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []); // Run only on mount

      const checkApiHealth = async () => {
        setIsChecking(true); // Start loading for check button
        setHealthStatus('loading'); // Set main status to loading
        setHealthDetails(null); // Clear previous details
        try {
          // Use the current value in the input field for the check
          const tempApi = axios.create({ baseURL: apiUrl });
          const health = (await tempApi.get('/health')).data;
          setHealthStatus(health.status === 'healthy' ? 'healthy' : 'unhealthy');
          setHealthDetails(health);
          if (health.status !== 'healthy') {
             toast.error('API connection check failed or API is unhealthy.');
          } else {
             toast.success('API connection successful!');
          }
        } catch (error) {
          setHealthStatus('unhealthy');
          toast.error(`Failed to connect to API at ${apiUrl}`);
        } finally {
          setIsChecking(false); // Stop loading for check button
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
            window.location.href = '/'; // Navigate to root to force reload with new context
          }, 1500);
        } catch (error) {
          toast.error('Failed to update API URL');
          setIsUpdating(false);
        }
        // No finally block needed here as the page reloads
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
                isLoading={isChecking} // Use isChecking state
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
                    healthStatus === 'unhealthy' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse' // Add pulse for loading
                  }`}></div>
                  <span className="text-sm font-medium text-white">
                    Status: {healthStatus === 'loading' ? 'Checking...' :
                      healthStatus === 'healthy' ? 'Connected' : 'Disconnected'}
                  </span>
                </div>

                {healthStatus === 'loading' && !isChecking && <Spinner size="sm" className="mt-4" />}

                {healthDetails && healthStatus !== 'loading' && (
                  <div className="mt-4 p-4 bg-gray-800 rounded-md text-sm border border-gray-700">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-gray-400">Vector DB Type:</div>
                      <div className="font-medium text-white">{healthDetails.vector_db_type || 'N/A'}</div>

                      <div className="text-gray-400">Vector DB URL:</div>
                      <div className="font-medium text-white truncate" title={healthDetails.vector_db_url}>{healthDetails.vector_db_url || 'N/A'}</div>

                      <div className="text-gray-400">Qdrant Connection:</div>
                      <div className="font-medium text-white">{healthDetails.qdrant_connection || 'N/A'}</div>
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
                      disabled={isUpdating} // Disable input while updating
                    />
                    <Button
                      onClick={handleUpdateApiUrl}
                      className="rounded-l-none"
                      isLoading={isUpdating} // Use isLoading prop
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
                      onClick={() => window.open('/docs', '_blank')} // Assuming /docs route exists or points to static docs
                    >
                      API Docs
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open('https://github.com/final-moment/fm-context-manager', '_blank')} // Update with actual repo URL if known
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
                      onClick={() => window.open(healthDetails?.vector_db_url || 'http://localhost:6333/dashboard', '_blank')} // Append /dashboard
                      disabled={!healthDetails?.vector_db_url} // Disable if URL not available
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
