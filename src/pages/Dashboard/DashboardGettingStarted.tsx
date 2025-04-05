import React from 'react';

    const DashboardGettingStarted: React.FC = () => {
      return (
        <div className="bg-gray-900 shadow rounded-lg overflow-hidden border border-gray-800">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-white">Getting Started</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-400">
              <p>
                The Final Moment Repository Manager allows you to process, store, and search documents using semantic search.
              </p>
            </div>
            <div className="mt-5">
              <div className="rounded-md bg-gray-800 px-6 py-5 sm:flex sm:items-start">
                {/* Icon could be added here if desired */}
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
      );
    };

    export default DashboardGettingStarted;
