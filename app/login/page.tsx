'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { PageLayout, ErrorDisplay } from '../components/ui';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await signIn(username, password);
      router.push('/'); // Redirect to home page after successful login
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred during login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageLayout title="Login">
      <div className="max-w-md mx-auto bg-gray-800 rounded-lg p-8 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username/Email Field */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300">
              Email or Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter your email or username"
              required
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter your password"
              required
            />
          </div>

          {/* Error Message */}
          {error && <ErrorDisplay message={error} />}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="text-center text-sm text-gray-400">
            Don't have an account?{' '}
            <Link href="/signup" className="text-blue-500 hover:text-blue-400">
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
