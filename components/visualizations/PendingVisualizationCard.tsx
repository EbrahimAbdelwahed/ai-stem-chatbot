import React from 'react';

interface PendingVisualizationCardProps {
  message: string; // e.g., "Generating [Plot of sin(x)]..."
  status: 'pending' | 'loading' | 'error';
  errorMessage?: string;
}

const PendingVisualizationCard: React.FC<PendingVisualizationCardProps> = ({ 
  message, 
  status, 
  errorMessage 
}) => {
  return (
    <div className="p-3 my-2 border rounded-md bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
        {status === 'loading' && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-gray-100 mr-2"></div>
        )}
        <p className="text-sm text-gray-700 dark:text-gray-300">{message}</p>
      </div>
      {status === 'error' && errorMessage && (
        <p className="text-sm text-red-500 mt-1">Error: {errorMessage}</p>
      )}
    </div>
  );
};

export default PendingVisualizationCard; 