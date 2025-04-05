import React from 'react';

    interface SpinnerProps {
      size?: 'sm' | 'md' | 'lg';
      className?: string;
      color?: string; // e.g., 'border-white', 'border-blue-500'
    }

    const Spinner: React.FC<SpinnerProps> = ({
      size = 'md',
      className = '',
      color = 'border-white',
    }) => {
      const sizeClasses = {
        sm: 'h-5 w-5 border-2',
        md: 'h-8 w-8 border-[3px]',
        lg: 'h-12 w-12 border-4',
      };

      return (
        <div className={`flex justify-center items-center ${className}`}>
          <div
            className={`animate-spin rounded-full ${sizeClasses[size]} ${color} border-b-transparent`}
            role="status"
            aria-label="Loading..."
          >
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      );
    };

    export default Spinner;
