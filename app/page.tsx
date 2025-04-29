'use client';

import Link from 'next/link';
import { DASHBOARD_ITEMS } from './constants';
import { useAuth } from './contexts/AuthContext';

export default function Home() {
  const { isAuthenticated } = useAuth();

  // Filter dashboard items based on authentication status
  const filteredItems = DASHBOARD_ITEMS.filter(item => 
    !item.requiresAuth || (item.requiresAuth && isAuthenticated)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-center mb-8">Nile API Demo Dashboard</h1>
        
        {isAuthenticated ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((page) => (
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
        ) : (
          <div className="max-w-md mx-auto bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">Welcome to Nile API Demo</h2>
            <p className="text-gray-300 mb-6">
              Please log in to access the dashboard features. All features require authentication.
            </p>
            <Link 
              href="/login" 
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-200"
            >
              Log In
            </Link>
            <p className="mt-4 text-gray-400">
              Don't have an account? <Link href="/signup" className="text-blue-400 hover:underline">Sign up</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
