'use client';

import Link from 'next/link';
import { DASHBOARD_ITEMS } from './constants';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-center mb-8">Nile Mobile Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DASHBOARD_ITEMS.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="block bg-gray-800 rounded-lg shadow-md p-6 hover:bg-gray-700 transition-colors duration-200"
            >
              <h2 className="text-2xl font-semibold mb-4">{page.title}</h2>
              <p className="text-gray-300">{page.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
