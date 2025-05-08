'use client';

import { Suspense } from 'react'; // Import Suspense
import { useRouter, useSearchParams } from 'next/navigation'; // Import useSearchParams
import { NetworkDevice, Building, Floor } from '../types'; // Add Building and Floor types
import { useFetch } from '../hooks';
import { fetchDevices, fetchBuildings, fetchFloors } from '../services/api'; // Add fetchBuildings and fetchFloors
import { PageLayout, LoadingState, ErrorState, DataItem } from '../components/ui';
import { useMemo, useState, useEffect } from 'react'; // Import useState, useEffect

// Component to read search params and render content
function DevicesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams(); // Get search params

  // State for expansion tracking: Key = buildingId/floorId, Value = boolean (true=expanded)
  const [expandedBuildings, setExpandedBuildings] = useState<Map<string, boolean>>(new Map());
  // Use a composite key "buildingId-floorId" for floors to ensure uniqueness across buildings
  const [expandedFloors, setExpandedFloors] = useState<Map<string, boolean>>(new Map());

  // Fetch devices, buildings, and floors
  const { data: devices, loading: devicesLoading, error: devicesError } = useFetch<NetworkDevice[]>(fetchDevices);
  const { data: buildings, loading: buildingsLoading, error: buildingsError } = useFetch<Building[]>(fetchBuildings);
  const { data: floors, loading: floorsLoading, error: floorsError } = useFetch<Floor[]>(fetchFloors);

  const authSuccess = searchParams.get('authSuccess') === 'true';
  const updatedMac = searchParams.get('mac');

  const handleCardClick = (device: NetworkDevice) => {
    if (device && device.id && device.macAddress) {
      router.push(`/macauth?deviceId=${device.id}&macAddress=${device.macAddress}`);
    } else {
      console.error('Cannot navigate to MAC auth: Device ID or MAC Address is missing for device:', device);
      alert('Device information is incomplete. Cannot proceed to authorization.');
    }
  };

  // Combine loading and error states
  const loading = devicesLoading || buildingsLoading || floorsLoading;
  const error = devicesError || buildingsError || floorsError;

  // Process and sort data once fetched using useMemo
  const groupedAndSortedData = useMemo(() => {
    if (!devices || !buildings || !floors) return null;

    // Create building and floor name lookups
    const buildingNameMap = new Map<string, string>();
    buildings.forEach(bldg => { if (bldg.bldgid && bldg.name) buildingNameMap.set(bldg.bldgid, bldg.name); });

    const floorNameMap = new Map<string, string>();
    floors.forEach(floor => { if (floor.floorid && floor.name) floorNameMap.set(floor.floorid, floor.name); });

    // Group devices: Building ID -> Floor ID -> Device List
    const groupedByBuilding = new Map<string, Map<string, NetworkDevice[]>>();
    devices.forEach(device => {
      const buildingId = device.buildingid || 'Unknown Building';
      const floorId = device.floorid || 'Unknown Floor';

      if (!groupedByBuilding.has(buildingId)) {
        groupedByBuilding.set(buildingId, new Map<string, NetworkDevice[]>());
      }
      const buildingMap = groupedByBuilding.get(buildingId)!;

      if (!buildingMap.has(floorId)) {
        buildingMap.set(floorId, []);
      }
      buildingMap.get(floorId)!.push(device);
    });

    // Sort devices within each floor group by MAC address
    groupedByBuilding.forEach(buildingMap => {
      buildingMap.forEach(floorList => {
        floorList.sort((a, b) => a.macAddress.localeCompare(b.macAddress));
      });
    });

    // Create a new map for the final sorted structure
    const finalGroupedData = new Map<string, Map<string, NetworkDevice[]>>();

    // Sort building keys by building name
    const sortedBuildingKeys = Array.from(groupedByBuilding.keys()).sort((a, b) => {
      const nameA = buildingNameMap.get(a) || a;
      const nameB = buildingNameMap.get(b) || b;
      return nameA.localeCompare(nameB);
    });

    // Iterate through sorted buildings and sort floors within each
    sortedBuildingKeys.forEach(buildingId => {
      const buildingMap = groupedByBuilding.get(buildingId)!;
      const sortedFloorKeys = Array.from(buildingMap.keys()).sort((a, b) => {
        const nameA = floorNameMap.get(a) || a;
        const nameB = floorNameMap.get(b) || b;
        // Consider numerical sort for floor numbers if applicable, otherwise localeCompare
        return nameA.localeCompare(nameB); 
      });

      const sortedFloorsMap = new Map<string, NetworkDevice[]>();
      sortedFloorKeys.forEach(floorKey => {
        sortedFloorsMap.set(floorKey, buildingMap.get(floorKey)!);
      });
      finalGroupedData.set(buildingId, sortedFloorsMap);
    });

    return { groupedData: finalGroupedData, sortedBuildingKeys, buildingNameMap, floorNameMap };

  }, [devices, buildings, floors]); // Add floors to dependency array

  // Initialize expansion state when data loads
  useEffect(() => {
    if (groupedAndSortedData) {
      const initialBuildingState = new Map<string, boolean>();
      const initialFloorState = new Map<string, boolean>();

      groupedAndSortedData.sortedBuildingKeys.forEach(buildingId => {
        initialBuildingState.set(buildingId, true); // Expand buildings by default
        const buildingMap = groupedAndSortedData.groupedData.get(buildingId);
        if (buildingMap) {
          Array.from(buildingMap.keys()).forEach(floorId => {
            const floorKey = `${buildingId}-${floorId}`;
            initialFloorState.set(floorKey, true); // Expand floors by default
          });
        }
      });
      setExpandedBuildings(initialBuildingState);
      setExpandedFloors(initialFloorState);
    }
  }, [groupedAndSortedData]); // Run when grouped data is ready

  // Toggle functions
  const toggleBuilding = (buildingId: string) => {
    setExpandedBuildings(prev => {
      const newState = new Map(prev);
      newState.set(buildingId, !prev.get(buildingId));
      return newState;
    });
  };

  const toggleFloor = (buildingId: string, floorId: string) => {
    const floorKey = `${buildingId}-${floorId}`;
    setExpandedFloors(prev => {
      const newState = new Map(prev);
      newState.set(floorKey, !prev.get(floorKey));
      return newState;
    });
  };


  if (loading) {
    return <LoadingState message="Loading devices, buildings, and floors..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!groupedAndSortedData || groupedAndSortedData.sortedBuildingKeys.length === 0) {
    return <ErrorState title="No Devices Requiring Attention" message="No devices currently need authorization." />;
  }

  // Destructure the processed data only if it's available
  // The main return will handle the null case via the loading/error/empty checks above.
  // This is more for type safety and clarity within the successful render path.
  if (!groupedAndSortedData) {
    // This case should ideally be caught by loading, error, or the empty check above,
    // but as a fallback or if logic changes, ensure we don't proceed.
    return <ErrorState title="Data Error" message="Could not process device data." />;
  }
  const { groupedData, sortedBuildingKeys, buildingNameMap, floorNameMap } = groupedAndSortedData;


  return (
    <PageLayout title="Network Devices">
      {/* Success Banner */}
      {authSuccess && updatedMac && (
        <div className="mb-4 p-3 bg-green-800 border border-green-600 text-green-100 rounded-md text-center">
          Device with MAC address {decodeURIComponent(updatedMac)} was successfully authorized.
        </div>
      )}

      {/* Container for all building groups */}
      <div className="space-y-8">
        {sortedBuildingKeys.map((buildingId) => {
          const buildingMap = groupedData.get(buildingId); // Get the map of floors for this building
          if (!buildingMap) return null; // Skip if building map is somehow empty

          const isBuildingExpanded = expandedBuildings.get(buildingId) ?? true; // Default to expanded

          return (
            // Container for a single building group
            <div key={buildingId}>
              <h2 
                className="text-2xl font-bold text-white mb-4 border-b-2 border-gray-600 pb-2 cursor-pointer hover:text-gray-300"
                onClick={() => toggleBuilding(buildingId)}
              >
                {isBuildingExpanded ? '[-] ' : '[+] '}
                {buildingNameMap.get(buildingId) || `Building ID: ${buildingId}` || 'Unknown Building'}
              </h2>
              {/* Container for floor groups within this building - Render only if building is expanded */}
              {isBuildingExpanded && (
                <div className="space-y-6 ml-4">
                  {Array.from(buildingMap.keys()).map((floorId) => { // Iterate through floor keys (already sorted)
                    const floorDevices = buildingMap.get(floorId); // Get devices for this floor
                    if (!floorDevices || floorDevices.length === 0) return null; // Skip if floor has no devices

                    const floorKey = `${buildingId}-${floorId}`;
                    const isFloorExpanded = expandedFloors.get(floorKey) ?? false; // Default to collapsed

                    return (
                      // Container for a single floor group
                      <div key={floorId}>
                        <h3 
                          className="text-xl font-semibold text-gray-200 mb-3 border-b border-gray-700 pb-1 cursor-pointer hover:text-gray-400"
                          onClick={() => toggleFloor(buildingId, floorId)}
                        >
                          {isFloorExpanded ? '[-] ' : '[+] '}
                          {floorNameMap.get(floorId) || `Floor ID: ${floorId}` || 'Unknown Floor'}
                        </h3>
                        {/* Container for devices within this floor group - Render only if floor is expanded */}
                        {isFloorExpanded && (
                          <div className="space-y-4 ml-4">
                            {floorDevices.map((device) => (
                              // --- Start Device Card ---
                              <div
                            key={device.id}
                            onClick={() => handleCardClick(device)}
                            className="bg-gray-800 rounded-lg p-4 shadow-md hover:bg-gray-700 cursor-pointer transition-colors duration-150"
                          >
                            <div className="flex flex-col space-y-2">
                              <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-2">
                                <h3 className="text-lg font-semibold text-white">{device.macAddress}</h3>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  device.state === 'AUTH_OK' ? 'bg-green-900 text-green-200' :
                                  device.state === 'AUTH_DENIED' ? 'bg-red-900 text-red-200' :
                                  (device.state === 'AUTH_WAITING_FOR_APPROVAL' && device.authenticatedBy?.startsWith('DOT1X')) ? 'bg-blue-900 text-blue-200' :
                                  'bg-yellow-900 text-yellow-200'
                                }`}>
                                  {device.state === 'AUTH_OK' ? 'Approved' :
                                   device.state === 'AUTH_DENIED' ? 'Denied' :
                                   device.state === 'AUTH_WAITING_FOR_APPROVAL' ? 'Waiting Approval' :
                                   device.state}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <DataItem label="Port" value={device.port} />
                                <DataItem label="Authentication" value={device.authenticatedBy} />
                                <DataItem label="IP Address" value={device.ipaddress || 'N/A'} />
                                <DataItem label="Device ID" value={device.deviceid} />
                              </div>
                              <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
                                Click to manage device authorization
                              </div>
                            </div>
                          </div>
                              // --- End Device Card ---
                            ))}
                          </div>
                        )} {/* End conditional rendering for devices */}
                      </div> // End container for single floor group
                    );
                  })}
                </div>
              )} {/* End conditional rendering for floor groups */}
            </div> // End container for single building group
          );
        })}
      </div> {/* End container for all building groups */}
    </PageLayout>
  );
}

// Wrap the content in Suspense because useSearchParams needs it
export default function NetworkDevicesPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading page..." />}>
      <DevicesPageContent />
    </Suspense>
  );
}
