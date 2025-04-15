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

interface Building {
  tenantid: string;
  siteid: string;
  bldgid: string;
  name: string;
  address: string; // JSON string that needs to be parsed
}

interface ParsedBuilding {
  tenantid: string;
  siteid: string;
  bldgid: string;
  name: string;
  address: Address;
}

export default function BuildingPage() {
  const [buildings, setBuildings] = useState<ParsedBuilding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('https://ofthddzjjh.execute-api.us-west-2.amazonaws.com/prod/bldgs');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const data = await response.json();
        
        // Validate the data structure
        if (!Array.isArray(data)) {
          throw new Error('Invalid data format received from API');
        }

        // Parse and validate each building
        const parsedBuildings = data.map((building: Building) => {
          try {
            const parsedAddress = JSON.parse(building.address) as Address;
            return {
              ...building,
              address: parsedAddress
            };
          } catch (parseError) {
            console.error('Error parsing building address:', parseError);
            throw new Error('Invalid address format in building data');
          }
        });

        setBuildings(parsedBuildings);
        setError(null);
      } catch (err) {
        console.error('Error in fetchData:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

  if (!buildings || buildings.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center">
        <div className="text-gray-300">No building information available</div>
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
          <h1 className="text-4xl font-bold">Building Information</h1>
          <Link 
            href="/" 
            className="text-gray-300 hover:text-white"
          >
            Return to Dashboard
          </Link>
        </div>

        {/* Buildings */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {buildings.map((building) => (
            <div key={building.bldgid} className="bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">
                <Link href={`/bldg/${building.bldgid}`} className="hover:text-blue-400 transition-colors duration-200">
                  {building.name}
                </Link>
              </h2>
              <div className="space-y-2">
                <p className="text-gray-300">Address: {building.address.street1}</p>
                {building.address.street2 && (
                  <p className="text-gray-300">Address Line 2: {building.address.street2}</p>
                )}
                <p className="text-gray-300">
                  {building.address.city}, {building.address.state} {building.address.zip}
                </p>
                <p className="text-gray-300">Country: {building.address.country}</p>
                <p className="text-gray-300">Time Zone: {building.address.timeZone.timeZoneId}</p>
                <p className="text-gray-300">
                  Coordinates: {building.address.latitude}, {building.address.longitude}
                </p>
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <div className="text-gray-300 space-y-2">
                    <p className="text-gray-300">Tenant ID: {building.tenantid}</p>
                    <p className="text-gray-300">Site ID: {building.siteid}</p>
                    <p className="text-gray-300">Building ID: {building.bldgid}</p>
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