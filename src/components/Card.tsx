import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children, className = '', footer }) => {
  return (
    <div className={`bg-gray-900 overflow-hidden shadow-md shadow-gray-800 rounded-lg border border-gray-800 ${className}`}>
      {title && (
        <div className="px-4 py-5 sm:px-6 border-b border-gray-800">
          <h3 className="text-lg leading-6 font-medium text-white">{title}</h3>
        </div>
      )}
      <div className="px-4 py-5 sm:p-6 overflow-x-auto">{children}</div>
      {footer && (
        <div className="px-4 py-4 sm:px-6 bg-gray-800 border-t border-gray-700">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
