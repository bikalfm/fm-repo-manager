import React from 'react';
    import Card from '../../components/Card'; // Adjusted import path
    import Spinner from '../../components/Spinner'; // Adjusted import path

    interface DashboardApiStatusProps {
      healthStatus: 'loading' | 'healthy' | 'unhealthy';
    }

    const DashboardApiStatus: React.FC<DashboardApiStatusProps> = ({ healthStatus }) => {
      const getStatusColor = () => {
        switch (healthStatus) {
          case 'healthy': return 'bg-green-500';
          case 'unhealthy': return 'bg-red-500';
          default: return 'bg-yellow-500 animate-pulse'; // Loading state
        }
      };

      const getStatusText = () => {
        switch (healthStatus) {
          case 'healthy': return 'Connected';
          case 'unhealthy': return 'Disconnected';
          default: return 'Checking...';
        }
      };

      return (
        <Card>
          <div className="flex items-center">
            {healthStatus === 'loading' ? (
              <Spinner size="sm" className="mr-2" />
            ) : (
              <div className={`h-3 w-3 rounded-full mr-2 ${getStatusColor()}`}></div>
            )}
            <span className="text-sm font-medium text-white">
              API Status: {getStatusText()}
            </span>
          </div>
        </Card>
      );
    };

    export default DashboardApiStatus;
