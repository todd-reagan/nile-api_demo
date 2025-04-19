'use client';

import Link from 'next/link';

interface ReturnToDashboardProps {
  className?: string;
}

export default function ReturnToDashboard({ className = '' }: ReturnToDashboardProps) {
  return (
    <Link 
      href="/index.html" 
      className={`text-gray-300 hover:text-white transition-colors duration-200 ${className}`}
    >
      Return to Dashboard
    </Link>
  );
}
