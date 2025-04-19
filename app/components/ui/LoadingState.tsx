'use client';

import LoadingSpinner from './LoadingSpinner';
import ReturnToDashboard from './ReturnToDashboard';

interface LoadingStateProps {
  message?: string;
  spinnerSize?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function LoadingState({
  message = 'Loading...',
  spinnerSize = 'medium',
  className = ''
}: LoadingStateProps) {
  return (
    <div className={`min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center ${className}`}>
      <LoadingSpinner size={spinnerSize} />
      {message && <p className="text-gray-300 mt-4">{message}</p>}
      <ReturnToDashboard className="mt-4" />
    </div>
  );
}
