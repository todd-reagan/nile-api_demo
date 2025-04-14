'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Floor {
  floorid: string;
  number: number;
  bldgid: string;
  tenantid: string;
  name: string;
  siteid: string;
}

export default function FloorPage() {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchData = async () => {
      try {
        const response = await fetch('https://ra4ynuzvux66faz2ai5l6m26uy0wmsml.lambda-url.us-west-2.on.aws/', {
          signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const jsonData = await response.json();
        
        if (!Array.isArray(jsonData)) {
          throw new Error('Invalid data format');
        }

        setFloors(jsonData);
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

  if (floors.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center">
        <div className="text-gray-300">No floors available</div>
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
          <h1 className="text-4xl font-bold">Floor Information</h1>
          <button
            onClick={() => router.push('/')}
            className="text-gray-300 hover:text-white"
          >
            Return to Dashboard
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {floors.map((floor, index) => (
            <div key={index} className="bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">
                <Link href={`/floor/${floor.floorid}`} className="hover:text-blue-400 transition-colors duration-200">
                  {floor.name}
                </Link>
              </h2>
              <div className="space-y-2">
                <p className="text-gray-300">Floor Number: {floor.number}</p>
                <p className="text-gray-300">Floor ID: {floor.floorid}</p>
                <p className="text-gray-300">Building ID: {floor.bldgid}</p>
                <p className="text-gray-300">Tenant ID: {floor.tenantid}</p>
                <p className="text-gray-300">Site ID: {floor.siteid}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 