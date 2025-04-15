'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

interface Site {
  tenantid: string;
  siteid: string;
  name: string;
  address: string; // JSON string that needs to be parsed
}

interface ParsedSite {
  tenantid: string;
  siteid: string;
  name: string;
  address: Address;
}

export default function SitesPage() {
  const [sites, setSites] = useState<ParsedSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchData = async () => {
      try {
        const response = await fetch('https://ofthddzjjh.execute-api.us-west-2.amazonaws.com/prod/sites', {
          signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!Array.isArray(data)) {
          throw new Error('Invalid data format');
        }

        const parsedSites = data.map((site: Site) => {
          try {
            const parsedAddress = JSON.parse(site.address) as Address;
            return {
              ...site,
              address: parsedAddress
            };
          } catch (e) {
            console.error('Error parsing address:', e);
            throw new Error('Invalid address format in site data');
          }
        });

        if (parsedSites.length === 0) {
          throw new Error('No valid sites found');
        }

        setSites(parsedSites);
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

  if (sites.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center">
        <div className="text-gray-300">No sites available</div>
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
          <h1 className="text-4xl font-bold">Site Information</h1>
          <button
            onClick={() => router.push('/')}
            className="text-gray-300 hover:text-white"
          >
            Return to Dashboard
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites.map((site) => (
            <div key={site.siteid} className="bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">
                <Link href={`/sites/${site.siteid}`} className="hover:text-blue-400 transition-colors duration-200">
                  {site.name}
                </Link>
              </h2>
              <div className="space-y-2">
                <p className="text-gray-300">Address: {site.address.street1}</p>
                {site.address.street2 && (
                  <p className="text-gray-300">Address Line 2: {site.address.street2}</p>
                )}
                <p className="text-gray-300">
                  {site.address.city}, {site.address.state} {site.address.zip}
                </p>
                <p className="text-gray-300">Country: {site.address.country}</p>
                <p className="text-gray-300">Time Zone: {site.address.timeZone.timeZoneId}</p>
                <p className="text-gray-300">
                  Coordinates: {site.address.latitude}, {site.address.longitude}
                </p>
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <div className="text-gray-300 space-y-2">
                    <p className="text-gray-300">Tenant ID: {site.tenantid}</p>
                    <p className="text-gray-300">Site ID: {site.siteid}</p>
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