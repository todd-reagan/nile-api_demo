'use client';

interface DataItemProps {
  label: string;
  value: string | number | null | undefined;
  className?: string;
}

export default function DataItem({ 
  label, 
  value, 
  className = '' 
}: DataItemProps) {
  if (value === null || value === undefined) {
    return null;
  }

  return (
    <p className={`text-gray-300 ${className}`}>
      <span className="font-medium">{label}:</span> {value}
    </p>
  );
}
