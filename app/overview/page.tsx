'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TimeZone {
  timeZoneId: string;
}

interface Address {
  id: string;
  name: string;
  street1: string;
  street2: string | null;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  altitude: number;
  geoRadius: number | null;
  subRegion: string | null;
  country: string;
  zip: string;
  timeZone: TimeZone;
}

interface Floor {
  floorid: string;
  name: string;
  number: string;
}

interface Building {
  bldgid: string;
  name: string;
  address: Address;
  floors: Floor[];
}

interface Site {
  siteid: string;
  name: string;
  address: Address;
  buildings: Building[];
}

interface Tenant {
  tenantid: string;
  sites: Site[];
}

export default function OverviewPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
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
        const response = await fetch('https://ofthddzjjh.execute-api.us-west-2.amazonaws.com/prod/tree', {
          signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid data format');
        }

        setTenant(data);
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

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center">
        <div className="text-gray-300">No data available</div>
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
          <h1 className="text-4xl font-bold">Network Overview</h1>
          <Link 
            href="/" 
            className="text-gray-300 hover:text-white"
          >
            Return to Dashboard
          </Link>
        </div>

        {/* Tenant Information */}
        <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Tenant</h2>
          <p className="text-gray-300"><span className="font-medium">Tenant ID:</span> {tenant.tenantid}</p>
        </div>

        {/* Sites */}
        <div className="space-y-8">
          {tenant.sites.map((site) => (
            <div key={site.siteid} className="bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">
                <Link href={`/sites/${site.siteid}`} className="hover:text-blue-400 transition-colors duration-200">
                  {site.name}
                </Link>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Address</h3>
                  <p className="text-gray-300">{site.address.street1}</p>
                  <p className="text-gray-300">{site.address.city}, {site.address.state} {site.address.zip}</p>
                  <p className="text-gray-300">{site.address.country}</p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Timezone</h3>
                  <p className="text-gray-300">{site.address.timeZone.timeZoneId}</p>
                </div>
              </div>

              {/* Buildings */}
              <div className="space-y-4">
                {site.buildings.map((building) => (
                  <div key={building.bldgid} className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-xl font-semibold mb-3">
                      <Link href={`/bldg/${building.bldgid}`} className="hover:text-blue-400 transition-colors duration-200">
                        {building.name}
                      </Link>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="text-md font-medium mb-2">Address</h4>
                        <p className="text-gray-300">{building.address.street1}</p>
                        <p className="text-gray-300">{building.address.city}, {building.address.state} {building.address.zip}</p>
                        <p className="text-gray-300">{building.address.country}</p>
                      </div>
                      <div>
                        <h4 className="text-md font-medium mb-2">Timezone</h4>
                        <p className="text-gray-300">{building.address.timeZone.timeZoneId}</p>
                      </div>
                    </div>

                    {/* Floors */}
                    <div className="space-y-2">
                      <h4 className="text-md font-medium">Floors</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {building.floors.map((floor) => (
                          <Link
                            key={floor.floorid}
                            href={`/floor`}
                            className="bg-gray-600 rounded p-2 hover:bg-gray-500 transition-colors duration-200"
                          >
                            <p className="font-medium">{floor.name}</p>
                            <p className="text-sm text-gray-300">Floor {floor.number}</p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 