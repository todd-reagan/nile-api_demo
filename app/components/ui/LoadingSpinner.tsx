'use client';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function LoadingSpinner({ 
  size = 'medium', 
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'h-6 w-6',
    medium: 'h-12 w-12',
    large: 'h-16 w-16'
  };

  return (
    <div className={`animate-spin rounded-full border-t-2 border-b-2 border-white ${sizeClasses[size]} ${className}`} />
  );
}
