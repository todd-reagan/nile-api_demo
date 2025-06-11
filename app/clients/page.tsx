'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo, Suspense } from 'react'; // Added useMemo, Suspense
import { PageLayout, LoadingState, ErrorState, Card, DataItem, InfoState } from '../components/ui'; // Added InfoState
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { Building, Floor } from '../types'; // Import Building and Floor types
import { fetchBuildings, fetchFloors } from '../services/api'; // Import fetchers
import { useFetch } from '../hooks'; // Keep useFetch for now, or migrate clientData fetch too

// Define a type for the client data items if not already available
// This is a simplified version based on usage in the original code
interface ClientConfig {
  id?: string; // Assuming there's an ID for keying
  macAddress?: string;
  authenticatedBy?: string;
  state?: string;
  description?: string;
  lastPort?: string;
  segmentId?: string;
  timestamp?: string;
  siteId?: string;
  buildingId?: string; // Used for grouping
  floorId?: string; // Used for grouping
}
interface ClientInfo {
  deviceType?: string;
  deviceManufacturer?: string;
  deviceOs?: string;
}
interface ClientDataItem {
  clientConfig: ClientConfig;
  clientInfo: ClientInfo;
}


export default function ClientsPage() {
  return (
    <ProtectedRoute>
      {/* Suspense might be needed if useSearchParams is used, but not directly here yet */}
      <ClientsContent />
    </ProtectedRoute>
  );
}

function ClientsContent() {
  const { apiKeys } = useAuth();
  // clientData will hold the raw array from the API
  const [rawClientData, setRawClientData] = useState<ClientDataItem[] | null>(null);
  const [loadingClients, setLoadingClients] = useState<boolean>(true);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // State for expansion tracking
  const [expandedBuildings, setExpandedBuildings] = useState<Map<string, boolean>>(new Map());
  const [expandedFloors, setExpandedFloors] = useState<Map<string, boolean>>(new Map()); // Key: "buildingId-floorId"

  // Fetch buildings and floors for name lookups
  const { data: buildings, loading: buildingsLoading, error: buildingsError } = useFetch<Building[]>(fetchBuildings);
  const { data: floors, loading: floorsLoading, error: floorsError } = useFetch<Floor[]>(fetchFloors);


  // Find tenant ID from API keys
  useEffect(() => {
    if (apiKeys.length > 0) {
      const apiKeyWithTenant = apiKeys.find(key => key.tenantId);
      if (apiKeyWithTenant && apiKeyWithTenant.tenantId) {
        setTenantId(apiKeyWithTenant.tenantId);
      } else {
        setClientsError('No tenant ID found in API keys. Please add an API key with a tenant ID in your profile.');
        setLoadingClients(false);
      }
    } else if (apiKeys && apiKeys.length === 0) { // Handle case where apiKeys is loaded but empty
        setClientsError('No API keys available. Please configure API keys in your profile.');
        setLoadingClients(false);
    }
  }, [apiKeys]);

  // Fetch client data from Nile API
  useEffect(() => {
    if (!tenantId) {
      if(apiKeys.length > 0) { // Only set loading to false if tenantId was expected but not found
         setLoadingClients(false);
      }
      return;
    }

    const fetchClientData = async () => {
      setLoadingClients(true);
      setClientsError(null);
      try {
        let nileApiKey = apiKeys.find(key => key.service === 'Nile' || key.service.toLowerCase().includes('nile'));
        if (!nileApiKey && apiKeys.length > 0) nileApiKey = apiKeys[0];
        
        if (!nileApiKey) {
          setClientsError('No suitable API key found. Please add a Nile API key in your profile.');
          setLoadingClients(false);
          return;
        }

        const token = nileApiKey.key;
        const url = `https://u1.nile-global.cloud/api/v3/client-configs/tenant/${tenantId}`;
        
        const MAX_RETRIES = 5;
        let retryCount = 0;
        let response = null;
        let responseData = null;

        while (retryCount <= MAX_RETRIES) {
          try {
            if (retryCount > 0) {
              const backoff = Math.random() * 4 + 1; // 1-5 seconds
              console.log(`Retry ${retryCount}/${MAX_RETRIES} after ${backoff.toFixed(2)} seconds backoff`);
              await new Promise(resolve => setTimeout(resolve, backoff * 1000));
            }
            
            response = await fetch(url, {
              headers: { 'x-nile-api-key': token.trim() }
            });
            
            console.log(`Response received. Status: ${response.status}`);
            
            if (response.status === 401 || response.status === 400) {
              retryCount++;
              if (retryCount <= MAX_RETRIES) {
                console.warn(`Received ${response.status}, will retry (${retryCount}/${MAX_RETRIES})`);
                continue;
              } else {
                console.error(`Received ${response.status}, max retries (${MAX_RETRIES}) exceeded`);
                throw new Error(`Request failed with status ${response.status} after ${MAX_RETRIES} retries`);
              }
            } else if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            responseData = await response.json();
            break;
          } catch (error) {
            const fetchError = error as Error;
            if (fetchError.name === 'TypeError' && retryCount < MAX_RETRIES) {
              retryCount++;
              console.warn(`Network error, will retry (${retryCount}/${MAX_RETRIES})`);
              continue;
            }
            throw error;
          }
        }
        
        setRawClientData(responseData as ClientDataItem[]);
      } catch (err) {
        console.error('Error fetching client data:', err);
        setClientsError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoadingClients(false);
      }
    };
    fetchClientData();
  }, [tenantId, apiKeys]);

  const loading = loadingClients || buildingsLoading || floorsLoading;
  const error = clientsError || buildingsError || floorsError;

  // Process and sort data once fetched
  const groupedAndSortedClientData = useMemo(() => {
    if (!rawClientData || !buildings || !floors) return null;

    const buildingNameMap = new Map<string, string>();
    buildings.forEach(bldg => { if (bldg.bldgid && bldg.name) buildingNameMap.set(bldg.bldgid, bldg.name); });

    const floorNameMap = new Map<string, string>();
    floors.forEach(floor => { if (floor.floorid && floor.name) floorNameMap.set(floor.floorid, floor.name); });

    const groupedByBuilding = new Map<string, Map<string, ClientDataItem[]>>();
    rawClientData.forEach(client => {
      const config = client.clientConfig || {};
      const buildingId = config.buildingId || 'Unknown Building';
      const floorId = config.floorId || 'Unknown Floor';

      if (!groupedByBuilding.has(buildingId)) {
        groupedByBuilding.set(buildingId, new Map<string, ClientDataItem[]>());
      }
      const buildingMap = groupedByBuilding.get(buildingId)!;

      if (!buildingMap.has(floorId)) {
        buildingMap.set(floorId, []);
      }
      buildingMap.get(floorId)!.push(client);
    });

    groupedByBuilding.forEach(buildingMap => {
      buildingMap.forEach(clientList => {
        clientList.sort((a, b) => 
          (a.clientConfig.macAddress || '').localeCompare(b.clientConfig.macAddress || '')
        );
      });
    });

    const finalGroupedData = new Map<string, Map<string, ClientDataItem[]>>();
    const sortedBuildingKeys = Array.from(groupedByBuilding.keys()).sort((a, b) =>
      (buildingNameMap.get(a) || a).localeCompare(buildingNameMap.get(b) || b)
    );

    sortedBuildingKeys.forEach(buildingId => {
      const buildingMap = groupedByBuilding.get(buildingId)!;
      const sortedFloorKeys = Array.from(buildingMap.keys()).sort((a, b) =>
        (floorNameMap.get(a) || a).localeCompare(floorNameMap.get(b) || b)
      );
      const sortedFloorsMap = new Map<string, ClientDataItem[]>();
      sortedFloorKeys.forEach(floorKey => {
        sortedFloorsMap.set(floorKey, buildingMap.get(floorKey)!);
      });
      finalGroupedData.set(buildingId, sortedFloorsMap);
    });

    return { groupedData: finalGroupedData, sortedBuildingKeys, buildingNameMap, floorNameMap };
  }, [rawClientData, buildings, floors]);

  // Initialize expansion state
  useEffect(() => {
    if (groupedAndSortedClientData) {
      const initialBuildingState = new Map<string, boolean>();
      const initialFloorState = new Map<string, boolean>();
      groupedAndSortedClientData.sortedBuildingKeys.forEach(buildingId => {
        initialBuildingState.set(buildingId, true); // Expand buildings by default
        const buildingMap = groupedAndSortedClientData.groupedData.get(buildingId);
        if (buildingMap) {
          Array.from(buildingMap.keys()).forEach(floorId => {
            initialFloorState.set(`${buildingId}-${floorId}`, true); // Expand floors by default
          });
        }
      });
      setExpandedBuildings(initialBuildingState);
      setExpandedFloors(initialFloorState);
    }
  }, [groupedAndSortedClientData]);

  const toggleBuilding = (buildingId: string) => {
    setExpandedBuildings(prev => new Map(prev).set(buildingId, !prev.get(buildingId)));
  };

  const toggleFloor = (buildingId: string, floorId: string) => {
    const key = `${buildingId}-${floorId}`;
    setExpandedFloors(prev => new Map(prev).set(key, !prev.get(key)));
  };
  
  if (loading) {
    return <LoadingState message="Loading client information..." />;
  }

  if (error) {
    return <ErrorState message={error} />; // This will show if tenantId is missing or API fails
  }
  
  if (!groupedAndSortedClientData || groupedAndSortedClientData.sortedBuildingKeys.length === 0) {
    return <InfoState title="No Client Devices" message="No client devices found for this tenant, or data is still loading." />;
  }

  const { groupedData, sortedBuildingKeys, buildingNameMap, floorNameMap } = groupedAndSortedClientData;

  // Helper function to get status badge color based on state and authentication method
  const getStatusBadgeColor = (state: string, authenticatedBy?: string) => {
    if (!state) return 'bg-gray-500'; // Default gray for unknown state
    
    // Specific check for DOT1X approved devices waiting for MAB
    if (state.includes('WAITING') && authenticatedBy?.startsWith('DOT1X')) {
      return 'bg-blue-500'; // Blue for DOT1X approved waiting MAB
    }
    
    // General state checks
    if (state.includes('OK')) return 'bg-green-500'; // Green for approved
    if (state.includes('WAITING')) return 'bg-yellow-500'; // Yellow for other waiting states
    if (state.includes('DENIED')) return 'bg-red-500'; // Red for denied
    
    return 'bg-gray-500'; // Fallback gray
  };
  
  // Helper function to get a more readable state description
  const getReadableState = (state?: string, authenticatedBy?: string) => {
    if (!state) return 'Unknown';
    if (state === 'AUTH_OK') return 'Approved';
    if (state === 'AUTH_WAITING_FOR_APPROVAL') return 'Waiting for Approval';
    if (state === 'AUTH_DENIED') return 'Denied';
    if (authenticatedBy) return authenticatedBy; // authenticatedBy is already optional, so this check is fine
    return state.replace('AUTH_', '').replace(/_/g, ' ').toLowerCase();
  };

  return (
    <PageLayout title="Client Information">
      {/* Tenant ID display removed */}
      {/* 
      <div className="mb-6">
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <h2 className="text-xl font-semibold mb-2">Tenant ID</h2>
          <p className="text-gray-300">{tenantId || 'Loading or not found...'}</p>
        </div>        
      </div>
      */}

      {/* Grouped Client Devices Section */}
      <div className="space-y-8">
        {sortedBuildingKeys.map((buildingId) => {
          const buildingMap = groupedData.get(buildingId);
          if (!buildingMap) return null;
          const isBuildingExpanded = expandedBuildings.get(buildingId) ?? true;

          return (
            <div key={buildingId}>
              <h2
                className="text-2xl font-bold text-white mb-4 border-b-2 border-gray-600 pb-2 cursor-pointer hover:text-gray-300"
                onClick={() => toggleBuilding(buildingId)}
              >
                {isBuildingExpanded ? '[-] ' : '[+] '}
                {buildingNameMap.get(buildingId) || `Building ID: ${buildingId}`}
              </h2>
              {isBuildingExpanded && (
                <div className="space-y-6 ml-4">
                  {Array.from(buildingMap.keys()).map((floorId) => {
                    const clientList = buildingMap.get(floorId);
                    if (!clientList || clientList.length === 0) return null;
                    const floorKey = `${buildingId}-${floorId}`;
                    const isFloorExpanded = expandedFloors.get(floorKey) ?? true;

                    return (
                      <div key={floorId}>
                        <h3
                          className="text-xl font-semibold text-gray-200 mb-3 border-b border-gray-700 pb-1 cursor-pointer hover:text-gray-400"
                          onClick={() => toggleFloor(buildingId, floorId)}
                        >
                          {isFloorExpanded ? '[-] ' : '[+] '}
                          {floorNameMap.get(floorId) || `Floor ID: ${floorId}`}
                        </h3>
                        {isFloorExpanded && (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-700">
                              <thead className="bg-gray-800">
                                <tr>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">MAC Address</th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Authenticated By</th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Device Type</th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Manufacturer</th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">OS</th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Port</th>
                                  {/* <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Segment</th> */}
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Last Updated</th>
                                  {/* <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th> */}
                                </tr>
                              </thead>
                              <tbody className="bg-gray-800 divide-y divide-gray-700">
                                {clientList.map((client, index) => {
                                  const config = client.clientConfig || {};
                                  const info = client.clientInfo || {};
                                  return (
                                    <tr key={config.id || `client-${index}`} className="hover:bg-gray-700">
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{config.macAddress || 'N/A'}</td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                                        <span
                                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(config.state || '', config.authenticatedBy)} text-white`}
                                        >
                                          {getReadableState(config.state || '', config.authenticatedBy)}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{config.authenticatedBy || 'N/A'}</td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{info.deviceType || 'N/A'}</td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{info.deviceManufacturer || 'N/A'}</td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{info.deviceOs || 'N/A'}</td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{config.lastPort || 'N/A'}</td>
                                      {/* <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{config.segmentId && config.segmentId !== 'Unknown' ? config.segmentId : 'N/A'}</td> */}
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{config.timestamp ? new Date(config.timestamp).toLocaleString() : 'N/A'}</td>
                                      {/* <td className="px-4 py-3 text-sm text-gray-300 break-words">{config.description || 'N/A'}</td> */}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Raw JSON Data Section - Kept for debugging/info if needed */}
      <div className="mt-12 bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-bold mb-4 text-white">Raw Client Data (for debugging)</h2>
        <p className="text-gray-300 mb-6">
          This page displays client configuration information for the tenant. The data is fetched from the Nile API endpoint:
          <code className="ml-2 px-2 py-1 bg-gray-900 rounded text-blue-400">
            https://u1.nile-global.cloud/api/v3/client-configs/tenant/{tenantId}
          </code>
        </p>

        
        {rawClientData && (
          <div className="relative">
            <pre className="bg-gray-900 p-4 rounded-lg overflow-auto max-h-[600px] text-sm text-gray-300">
              {JSON.stringify(rawClientData, null, 2)}
            </pre>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(rawClientData, null, 2));
                alert('JSON copied to clipboard!');
              }}
              className="absolute top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
            >
              Copy JSON
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
