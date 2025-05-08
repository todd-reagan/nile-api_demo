'use client';

interface InfoDisplayProps {
  title?: string;
  message: string;
  className?: string;
}

export default function InfoDisplay({
  title = 'Information', // Default title
  message,
  className = ''
}: InfoDisplayProps) {
  return (
    // Using blue styling for neutral information
    <div className={`bg-blue-900/50 border border-blue-500 text-blue-200 px-4 py-3 rounded ${className}`}>
      <p className="font-semibold">{title}</p>
      <p>{message}</p>
    </div>
  );
}
