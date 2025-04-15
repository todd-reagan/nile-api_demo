'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface GeoScope {
  siteIds: string[];
  buildingIds: string[];
  floorIds: string[];
}

interface NetworkDevice {
  id: string;
  macAddress: string;
  tenantid: string;
  siteid: string;
  buildingid: string;
  floorid: string;
  zoneid: string;
  segmentid: string;
  deviceid: string;
  port: string;
  state: string;
  geoScope: GeoScope;
  authenticatedBy: string;
  staticip: string | null;
  ipaddress: string | null;
}

export default function NetworkDevicesPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch('https://ofthddzjjh.execute-api.us-west-2.amazonaws.com/prod/devices');
        if (!response.ok) throw new Error('Failed to fetch device data');
        const data = await response.json();
        setDevices(data);
      } catch (err) {
        console.error('Error fetching devices:', err);
        setError('Failed to load network devices');
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  const handleRowClick = (device: NetworkDevice) => {
    router.push(`/macauth?deviceId=${device.id}&macAddress=${device.macAddress}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Network Devices</h1>
          <Link 
            href="/" 
            className="text-gray-300 hover:text-white transition-colors duration-200"
          >
            Return to Dashboard
          </Link>
        </div>

        {loading ? (
          <div className="text-center text-gray-300">Loading devices...</div>
        ) : error ? (
          <div className="text-center text-red-500">Error: {error}</div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">MAC Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Port</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">State</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Authentication</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">IP Address</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {devices.map((device) => (
                  <tr 
                    key={device.id}
                    data-device-id={device.id}
                    onClick={() => handleRowClick(device)}
                    className="hover:bg-gray-700 cursor-pointer transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{device.macAddress}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{device.port}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{device.state}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{device.authenticatedBy}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{device.ipaddress || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 