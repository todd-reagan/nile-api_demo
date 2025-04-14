'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
  timeZone: {
    timeZoneId: string;
  };
}

interface Building {
  bldgid: string;
  address: string;
  tenantid: string;
  name: string;
  siteid: string;
  parsedAddress?: Address;
}

export default function BuildingPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching building data...');
        const response = await fetch('https://shs53efu7ww47ytm7ljslxtvbe0cjdyt.lambda-url.us-west-2.on.aws/');
        if (!response.ok) {
          throw new Error('Failed to fetch building data');
        }
        const jsonData = await response.json();
        console.log('Building data:', jsonData);
        
        // Process the data
        const processedBuildings = jsonData.map((item: any) => {
          try {
            const parsedAddress = JSON.parse(item.address) as Address;
            return {
              ...item,
              parsedAddress
            };
          } catch (parseError) {
            console.error('Error parsing address:', parseError);
            return null;
          }
        }).filter(Boolean);

        if (processedBuildings.length === 0) {
          throw new Error('No valid buildings found');
        }

        setBuildings(processedBuildings);
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
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-gray-300">Loading building information...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Building Information</h1>
          <Link 
            href="/" 
            className="text-gray-300 hover:text-white transition-colors duration-200"
          >
            Return to Dashboard
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6">
          {buildings.map((building) => (
            <div key={building.bldgid} className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">{building.name}</h2>
              <div className="text-gray-300 space-y-2">
                <p className="font-medium">Building Address:</p>
                <p>{building.parsedAddress?.street1}</p>
                {building.parsedAddress?.street2 && <p>{building.parsedAddress.street2}</p>}
                <p>{building.parsedAddress?.city}, {building.parsedAddress?.state} {building.parsedAddress?.zip}</p>
                <p>{building.parsedAddress?.country}</p>
                <p>Timezone: {building.parsedAddress?.timeZone.timeZoneId}</p>
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <p className="font-medium">Additional Information:</p>
                  <p>Building ID: {building.bldgid}</p>
                  <p>Tenant ID: {building.tenantid}</p>
                  <p>Site ID: {building.siteid}</p>
                  <p>Coordinates: {building.parsedAddress?.latitude}, {building.parsedAddress?.longitude}</p>
                  <p>Altitude: {building.parsedAddress?.altitude}m</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 