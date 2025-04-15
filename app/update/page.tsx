'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UpdatePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleUpdate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('https://ofthddzjjh.execute-api.us-west-2.amazonaws.com/prod/tenantupdate');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.text();
      if (data.includes('successfully')) {
        setSuccess(true);
      } else {
        throw new Error('Update failed');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Update Database</h1>
          <button
            onClick={() => router.push('/')}
            className="text-gray-300 hover:text-white"
          >
            Return to Dashboard
          </button>
        </div>
        <div className="max-w-md mx-auto bg-gray-800 rounded-lg shadow-md p-6">
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded mb-4">
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-900/50 border border-green-500 text-green-300 px-4 py-3 rounded mb-4">
              <p className="font-semibold">Success</p>
              <p>Database updated successfully</p>
            </div>
          )}

          <div className="flex flex-col items-center space-y-4">
            <button
              onClick={handleUpdate}
              disabled={loading}
              className={`px-4 py-2 rounded font-semibold ${
                loading
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              {loading ? 'Updating...' : 'Update Database'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 