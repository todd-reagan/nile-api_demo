'use client';

import InfoDisplay from './InfoDisplay'; // Import InfoDisplay
import ReturnToDashboard from './ReturnToDashboard';

interface InfoStateProps {
  title?: string;
  message: string;
  className?: string;
}

export default function InfoState({
  title = 'Information', // Default title
  message,
  className = ''
}: InfoStateProps) {
  return (
    // Using similar layout as ErrorState but maybe different background if needed
    // For now, keeping the same background gradient
    <div className={`min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center ${className}`}>
      <div className="text-center">
        <InfoDisplay title={title} message={message} className="mb-4" />
      </div>
      <ReturnToDashboard className="mt-4" />
    </div>
  );
}
