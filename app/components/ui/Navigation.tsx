'use client';

import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';

export default function Navigation() {
  const { isAuthenticated, isLoading, signOut, userAttributes } = useAuth();

  return (
    <nav className="bg-gray-900 text-white py-4 px-6 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          Nile API Demo
        </Link>
        
        <div className="flex items-center space-x-6">
          {isLoading ? (
            <div className="text-gray-400">Loading...</div>
          ) : isAuthenticated ? (
            <>
              <span className="text-gray-300">
                Welcome, {userAttributes?.name || userAttributes?.email || 'User'}
              </span>
              <Link 
                href="/profile" 
                className="text-gray-300 hover:text-white transition-colors"
              >
                Profile
              </Link>
              <button
                onClick={signOut}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link 
                href="/login" 
                className="text-gray-300 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link 
                href="/signup" 
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
