'use client';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  className?: string;
}

export default function ErrorDisplay({
  title = 'Error',
  message,
  className = ''
}: ErrorDisplayProps) {
  return (
    <div className={`bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded ${className}`}>
      <p className="font-semibold">{title}</p>
      <p>{message}</p>
    </div>
  );
}
