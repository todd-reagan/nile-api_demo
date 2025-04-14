'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface NetworkDevice {
  floorid: string;
  macAddress: string;
  authenticatedBy: string;
  port: string;
  segmentId: string;
  tenantId: string;
  siteid: string;
  id: string;
  state: string;
  deviceId: string;
  buildingid: string;
}

export default function NetworkDevicesPage() {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch(
          'https://ld5kktc7qjg42pybjunukka3qq0ewtqd.lambda-url.us-west-2.on.aws/'
        );
        if (!response.ok) throw new Error('Failed to fetch device data');
        const data = await response.json();
        setDevices(data);
      } catch (err) {
        setError('Failed to load network devices');
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  if (loading) return <div className="text-center p-8">Loading network devices...</div>;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Network Devices</h1>
          <Link 
            href="/" 
            className="text-gray-300 hover:text-white transition-colors duration-200"
          >
            Return to Dashboard
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-800 rounded-lg">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">MAC Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Port</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Authentication</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">State</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Device ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {devices.map((device) => (
                <tr key={device.id} className="hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium">{device.macAddress}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">{device.port}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">{device.authenticatedBy}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      device.state === 'AUTH_WAITING_FOR_APPROVAL' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {device.state}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">{device.deviceId}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 