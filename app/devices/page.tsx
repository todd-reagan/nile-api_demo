'use client';

import { useRouter } from 'next/navigation';
import { NetworkDevice } from '../types';
import { useFetch } from '../hooks';
import { fetchDevices } from '../services/api';
import { PageLayout, LoadingState, ErrorState, DataItem } from '../components/ui';

export default function NetworkDevicesPage() {
  const router = useRouter();
  const { data: devices, loading, error } = useFetch<NetworkDevice[]>(fetchDevices);

  const handleCardClick = (device: NetworkDevice) => {
    router.push(`/macauth.html?deviceId=${device.id}&macAddress=${device.macAddress}`);
  };

  if (loading) {
    return <LoadingState message="Loading devices..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!devices || devices.length === 0) {
    return <ErrorState title="No Data" message="No devices found" />;
  }

  return (
    <PageLayout title="Network Devices">
      <div className="space-y-4">
        {devices.map((device) => (
          <div 
            key={device.id}
            onClick={() => handleCardClick(device)}
            className="bg-gray-800 rounded-lg p-4 shadow-md hover:bg-gray-700 cursor-pointer transition-colors duration-150"
          >
            <div className="flex flex-col space-y-2">
              <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-2">
                <h3 className="text-lg font-semibold text-white">{device.macAddress}</h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  device.state === 'Approved' ? 'bg-green-900 text-green-200' : 
                  device.state === 'Denied' ? 'bg-red-900 text-red-200' : 
                  'bg-yellow-900 text-yellow-200'
                }`}>
                  {device.state}
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <DataItem label="Port" value={device.port} />
                <DataItem label="Authentication" value={device.authenticatedBy} />
                <DataItem label="IP Address" value={device.ipaddress || 'N/A'} />
                <DataItem label="Device ID" value={device.deviceid} />
              </div>
              
              {/* Additional information that can be shown/hidden */}
              <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
                Click to manage device authorization
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
