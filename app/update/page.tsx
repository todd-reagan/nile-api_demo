'use client';

import { useState } from 'react';
import { updateTenantData } from '../services/api';
import { PageLayout, ErrorDisplay } from '../components/ui';

export default function UpdatePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateTenantData();
      if (result.success) {
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
    <PageLayout title="Update Database">
      <div className="max-w-md mx-auto bg-gray-800 rounded-lg shadow-md p-6">
        {error && (
          <ErrorDisplay message={error} className="mb-4" />
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
    </PageLayout>
  );
}
