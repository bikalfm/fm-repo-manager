import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Database, Search, HardDrive, FileText, ArrowRight } from 'lucide-react';
import Card from '../components/Card';
import SearchBar from '../components/SearchBar';
import { checkHealth } from '../api';
import toast from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<'loading' | 'healthy' | 'unhealthy'>('loading');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const health = await checkHealth();
        setHealthStatus(health.status === 'healthy' ? 'healthy' : 'unhealthy');
      } catch (error) {
        setHealthStatus('unhealthy');
        toast.error('Failed to connect to API');
      }
    };

    checkApiHealth();
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Navigate programmatically to search page with query
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
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-white sm:text-3xl sm:truncate">
            Final Moment Context API Dashboard
          </h2>
        </div>
      </div>

      <div className="mb-8">
        <Card>
          <div className="max-w-3xl mx-auto">
            <h3 className="text-lg font-medium text-center mb-4 text-white">Search your medical documents</h3>
            <SearchBar 
              onSearch={handleSearch} 
              placeholder="Search for medical terms, treatments, diagnoses..." 
              className="max-w-2xl mx-auto"
            />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {features.map((feature) => (
          <Link key={feature.name} to={feature.href}>
            <Card className="h-full hover:shadow-lg hover:shadow-gray-700 transition-shadow">
              <div className="flex flex-col h-full">
                <div className="flex items-center mb-4">
                  <div className={`p-2 rounded-md ${feature.color}`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="ml-3 text-lg font-medium text-white">{feature.name}</h3>
                </div>
                <p className="text-gray-400 text-sm flex-grow">{feature.description}</p>
                <div className="mt-4 flex items-center text-white text-sm font-medium">
                  <span>Get started</span>
                  <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mb-8">
        <Card>
          <div className="flex items-center">
            <div className={`h-3 w-3 rounded-full mr-2 ${
              healthStatus === 'healthy' ? 'bg-green-500' : 
              healthStatus === 'unhealthy' ? 'bg-red-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-sm font-medium text-white">
              API Status: {healthStatus === 'loading' ? 'Checking...' : 
                healthStatus === 'healthy' ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </Card>
      </div>

      <div className="bg-gray-900 shadow rounded-lg overflow-hidden border border-gray-800">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-white">Getting Started</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-400">
            <p>
              The Final Moment Context API allows you to process, store, and search medical documents using semantic search.
            </p>
          </div>
          <div className="mt-5">
            <div className="rounded-md bg-gray-800 px-6 py-5 sm:flex sm:items-start">
              <div className="mt-3 sm:mt-0 sm:ml-4">
                <div className="text-sm font-medium text-white">Quick Start Guide</div>
                <div className="mt-2 text-sm text-gray-400">
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Create a repository to store your documents</li>
                    <li>Upload and process medical documents</li>
                    <li>Search across your documents using natural language</li>
                    <li>Import documents from Google Drive</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
