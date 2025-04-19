'use client';

import { ReactNode } from 'react';
import Link from 'next/link';

interface CardProps {
  title: string;
  href?: string;
  children: ReactNode;
  className?: string;
}

export default function Card({ 
  title, 
  href, 
  children, 
  className = '' 
}: CardProps) {
  const cardContent = (
    <>
      <h2 className="text-2xl font-semibold mb-4">{title}</h2>
      <div className="space-y-2">
        {children}
      </div>
    </>
  );

  return (
    <div className={`bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
      {href ? (
        <Link href={href} className="block">
          <h2 className="text-2xl font-semibold mb-4 hover:text-blue-400 transition-colors duration-200">{title}</h2>
          <div className="space-y-2">
            {children}
          </div>
        </Link>
      ) : (
        cardContent
      )}
    </div>
  );
}
