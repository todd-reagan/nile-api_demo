'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Segment {
  segment: string;
}

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchData = async () => {
      try {
        const response = await fetch('https://r734rgw5dju6ibxoyx47totfgm0mtxeu.lambda-url.us-west-2.on.aws/', {
          signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const jsonData = await response.json();
        
        if (!Array.isArray(jsonData)) {
          throw new Error('Invalid data format');
        }

        setSegments(jsonData);
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            console.log('Fetch aborted');
            return;
          }
          setError(err.message);
        } else {
          setError('An unexpected error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        <button
          onClick={() => router.push('/')}
          className="mt-4 text-gray-300 hover:text-white"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center">
        <div className="text-red-400 text-center">
          <p className="text-xl font-semibold">Error</p>
          <p>{error}</p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="mt-4 text-gray-300 hover:text-white"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (segments.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center">
        <div className="text-gray-300">No segments available</div>
        <button
          onClick={() => router.push('/')}
          className="mt-4 text-gray-300 hover:text-white"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Network Segments</h1>
          <button
            onClick={() => router.push('/')}
            className="text-gray-300 hover:text-white"
          >
            Return to Dashboard
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {segments.map((segment, index) => (
            <div key={index} className="bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">
                <Link href={`/segments/${encodeURIComponent(segment.segment)}`} className="hover:text-blue-400 transition-colors duration-200">
                  {segment.segment}
                </Link>
              </h2>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 