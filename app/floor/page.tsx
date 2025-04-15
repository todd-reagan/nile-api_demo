'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Floor {
  tenantid: string;
  siteid: string;
  bldgid: string;
  floorid: string;
  name: string;
  number: string;
}

export default function FloorPage() {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip API call during static export
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const fetchData = async () => {
      try {
        const response = await fetch('https://ofthddzjjh.execute-api.us-west-2.amazonaws.com/prod/floors', {
          signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!Array.isArray(data)) {
          throw new Error('Invalid data format');
        }

        setFloors(data);
        setError(null);
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
        <Link 
          href="/" 
          className="mt-4 text-gray-300 hover:text-white"
        >
          Return to Dashboard
        </Link>
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
        <Link 
          href="/" 
          className="mt-4 text-gray-300 hover:text-white"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  if (floors.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center">
        <div className="text-gray-300">No floors available</div>
        <Link 
          href="/" 
          className="mt-4 text-gray-300 hover:text-white"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Floors</h1>
          <Link 
            href="/" 
            className="text-gray-300 hover:text-white"
          >
            Return to Dashboard
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {floors.map((floor) => (
            <div key={floor.floorid} className="bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">{floor.name}</h2>
              <div className="space-y-2">
                <p className="text-gray-300"><span className="font-medium">Floor Number:</span> {floor.number}</p>
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <div className="text-gray-300 space-y-2">
                  <p className="text-gray-300"><span className="font-medium">Tenant ID:</span> {floor.tenantid}</p>
                  <p className="text-gray-300"><span className="font-medium">Site ID:</span> {floor.siteid}</p>
                  <p className="text-gray-300"><span className="font-medium">Building ID:</span> {floor.bldgid}</p>  
                    <p className="text-gray-300"><span className="font-medium">Floor ID:</span> {floor.floorid}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 