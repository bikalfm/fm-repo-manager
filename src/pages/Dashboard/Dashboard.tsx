import React, { useEffect, useState } from 'react';
    import { Database, Search, HardDrive, FileText } from 'lucide-react';
    import Card from '../../components/Card';
    import SearchBar from '../../components/SearchBar';
    import toast from 'react-hot-toast';
 

    // Import sub-components
    import DashboardFeatureCard from './DashboardFeatureCard';
    import DashboardApiStatus from './DashboardApiStatus';
    import DashboardGettingStarted from './DashboardGettingStarted';

    // Import the dedicated API functions for this page
    import { fetchDashboardHealth as checkHealth } from './api';
    import Spinner from '../../components/Spinner'; // Import Spinner

    const Dashboard: React.FC = () => {
      const [healthStatus, setHealthStatus] = useState<'loading' | 'healthy' | 'unhealthy'>('loading');
      const [isLoading, setIsLoading] = useState(true); // Add loading state

      useEffect(() => {
        const checkApiHealth = async () => {
          setHealthStatus('loading');
          try {
            const health = await checkHealth();
            setHealthStatus(health.status === 'healthy' ? 'healthy' : 'unhealthy');
          } catch (error) {
            setHealthStatus('unhealthy');
            toast.error('Failed to connect to API');
          } finally {
            setIsLoading(false); // Set loading to false after API call completes
          }
        };

        checkApiHealth();
      }, []);

      const handleSearch = (query: string) => {
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
      };

      const features = [
        {
          name: 'Repositories',
          description: 'Manage document repositories and process files',
          icon: Database,
          href: '/repositories',
          color: 'bg-white text-black',
        },
        {
          name: 'Search',
          description: 'Search across all your documents with semantic search',
          icon: Search,
          href: '/search',
          color: 'bg-white text-black',
        },
        {
          name: 'Google Drive',
          description: 'Import and process documents from Google Drive',
          icon: HardDrive,
          href: '/drive',
          color: 'bg-white text-black',
        },
        {
          name: 'Documents',
          description: 'View and manage all your processed documents',
          icon: FileText,
          href: '/documents',
          color: 'bg-white text-black',
        },
      ];

      return (
        <div>
          {isLoading ? ( // Show loading indicator during initial load
            <div className="py-12">
              <Spinner className="mx-auto" size="lg" color="border-gray-400" />
              <p className="mt-4 text-center text-gray-400">Validating API Connection...</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold leading-7 text-white sm:text-3xl sm:truncate">

                    
                    Repository hub
                  </h2>
                </div> 
              </div>

              {/* Search Bar Section */}
              <div className="mb-8">
                <Card>
                  <div className="max-w-3xl mx-auto">
                    <h3 className="text-lg font-medium text-center mb-4 text-white">Search your documents</h3>
                    <SearchBar
                      onSearch={handleSearch}
                      placeholder="Search for medical terms, treatments, diagnoses..."
                      className="max-w-2xl mx-auto"
                    />
                  </div>
                </Card>
              </div>

              {/* Features Section */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                {features.map((feature) => (
                  <DashboardFeatureCard key={feature.name} {...feature} />
                ))}
              </div>

              {/* API Status Section */}
              <div className="mb-8">
                <DashboardApiStatus healthStatus={healthStatus} />
              </div>

              {/* Getting Started Section */}
              <DashboardGettingStarted />
            </>
          )}
        </div>
      );
    };

    export default Dashboard;
