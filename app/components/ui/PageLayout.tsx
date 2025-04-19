'use client';

import { ReactNode } from 'react';
import ReturnToDashboard from './ReturnToDashboard';

interface PageLayoutProps {
  title: string;
  children: ReactNode;
  className?: string;
  returnComponent?: ReactNode;
}

export default function PageLayout({ 
  title, 
  children, 
  className = '',
  returnComponent
}: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className={`container mx-auto px-4 py-16 ${className}`}>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">{title}</h1>
          {returnComponent || <ReturnToDashboard />}
        </div>
        {children}
      </div>
    </div>
  );
}
