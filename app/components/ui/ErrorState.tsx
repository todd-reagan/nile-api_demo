'use client';

import ErrorDisplay from './ErrorDisplay';
import ReturnToDashboard from './ReturnToDashboard';

interface ErrorStateProps {
  title?: string;
  message: string;
  className?: string;
}

export default function ErrorState({
  title = 'Error',
  message,
  className = ''
}: ErrorStateProps) {
  return (
    <div className={`min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center ${className}`}>
      <div className="text-center">
        <ErrorDisplay title={title} message={message} className="mb-4" />
      </div>
      <ReturnToDashboard className="mt-4" />
    </div>
  );
}
