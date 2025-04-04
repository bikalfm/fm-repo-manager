import React from 'react';
import Button from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionText,
  onAction
}) => {
  return (
    <div className="text-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-gray-900 rounded-lg border border-gray-800 shadow-md">
      {icon && (
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-800 text-white mb-4">
          {icon}
        </div>
      )}
      <h3 className="mt-2 text-lg font-medium text-white">{title}</h3>
      <p className="mt-1 text-sm text-gray-400 max-w-md mx-auto">{description}</p>
      {actionText && onAction && (
        <div className="mt-6">
          <Button onClick={onAction}>{actionText}</Button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
