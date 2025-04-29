'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { PageLayout, LoadingState, ErrorState, Card, DataItem } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

export default function ClientsPage() {
  const { apiKeys } = useAuth();
  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Find tenant ID from API keys
  useEffect(() => {
    if (apiKeys.length > 0) {
      // Try to find an API key with a tenant ID
      const apiKeyWithTenant = apiKeys.find(key => key.tenantId);
      
      if (apiKeyWithTenant && apiKeyWithTenant.tenantId) {
        setTenantId(apiKeyWithTenant.tenantId);
      } else {
        setError('No tenant ID found in API keys. Please add an API key with a tenant ID in your profile.');
        setLoading(false);
      }
    }
  }, [apiKeys]);

  // Fetch client data from Nile API with retry logic
  useEffect(() => {
    if (!tenantId) return;

    const fetchClientData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Try to find a suitable API key
        let nileApiKey = apiKeys.find(key => key.service === 'Nile');
        
        // If not found, try case-insensitive match containing "nile"
        if (!nileApiKey) {
          nileApiKey = apiKeys.find(key => 
            key.service.toLowerCase().includes('nile')
          );
        }
        
        // If still not found, use the first API key available
        if (!nileApiKey && apiKeys.length > 0) {
          nileApiKey = apiKeys[0];
        }
        
        if (!nileApiKey) {
          setError('No API keys found. Please add a Nile API key in your profile.');
          setLoading(false);
          return;
        }

        const token = nileApiKey.key;
        const url = `https://u1.nile-global.cloud/api/v3/client-configs/tenant/${tenantId}`;
        
        // Add retry logic for 401 responses
        const MAX_RETRIES = 5;
        let retryCount = 0;
        let response = null;
        let responseData = null;
        
        while (retryCount <= MAX_RETRIES) {
          try {
            if (retryCount > 0) {
              // Calculate random backoff time between 1 and 5 seconds
              const backoff = Math.random() * 4 + 1; // 1-5 seconds
              console.log(`Retry ${retryCount}/${MAX_RETRIES} after ${backoff.toFixed(2)} seconds backoff`);
              await new Promise(resolve => setTimeout(resolve, backoff * 1000));
            }
            
            // Make the API request
            response = await fetch(url, {
              headers: { 'x-nile-api-key': token.trim() }
            });
            
            console.log(`Response received. Status: ${response.status}`);
            
            // If response is 401, retry with backoff
            if (response.status === 401) {
              retryCount++;
              if (retryCount <= MAX_RETRIES) {
                console.warn(`Received 401 Unauthorized, will retry (${retryCount}/${MAX_RETRIES})`);
                continue;
              } else {
                console.error(`Received 401 Unauthorized, max retries (${MAX_RETRIES}) exceeded`);
                throw new Error(`Authentication failed after ${MAX_RETRIES} retries`);
              }
            } else if (!response.ok) {
              // For other non-200 responses, throw an error
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // If we got here, the request was successful
            responseData = await response.json();
            break;
          } catch (error) {
            // If this is a network error, retry
            const fetchError = error as Error;
            if (fetchError.name === 'TypeError' && retryCount < MAX_RETRIES) {
              retryCount++;
              console.warn(`Network error, will retry (${retryCount}/${MAX_RETRIES})`);
              continue;
            }
            // Otherwise, rethrow the error
            throw error;
          }
        }
        
        setClientData(responseData);
      } catch (err) {
        console.error('Error fetching client data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchClientData();
  }, [tenantId, apiKeys]);

  if (loading) {
    return <LoadingState message="Loading client information..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  // Helper function to get status badge color based on state
  const getStatusBadgeColor = (state: string) => {
    if (!state) return 'bg-gray-500';
    
    if (state.includes('OK')) return 'bg-green-500';
    if (state.includes('WAITING')) return 'bg-yellow-500';
    if (state.includes('DENIED')) return 'bg-red-500';
    
    return 'bg-gray-500';
  };
  
  // Helper function to get a more readable state description
  const getReadableState = (state: string, authenticatedBy: string) => {
    if (!state) return 'Unknown';
    
    if (state === 'AUTH_OK') return 'Approved';
    if (state === 'AUTH_WAITING_FOR_APPROVAL') return 'Waiting for Approval';
    if (state === 'AUTH_DENIED') return 'Denied';
    
    // If we have authenticatedBy info, use that
    if (authenticatedBy) return authenticatedBy;
    
    return state.replace('AUTH_', '').replace(/_/g, ' ').toLowerCase();
  };
  
  return (
    <PageLayout title="Client Information">
      <div className="mb-6">
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <h2 className="text-xl font-semibold mb-2">Tenant ID</h2>
          <p className="text-gray-300">{tenantId}</p>
        </div>        
      </div>
      
      {/* Client Cards Section */}
      {clientData && clientData.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-white">Client Devices</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clientData.map((client: any, index: number) => {
              const config = client.clientConfig || {};
              const info = client.clientInfo || {};
              
              return (
                <div key={index} className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
                  {/* Card Header with Status */}
                  <div className="flex justify-between items-center p-4 bg-gray-700">
                    <h3 className="text-lg font-semibold truncate">
                      {info.deviceType || 'Unknown Device'}
                    </h3>
                    <span 
                      className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusBadgeColor(config.state)}`}
                    >
                      {getReadableState(config.state, config.authenticatedBy)}
                    </span>
                  </div>
                  
                  {/* Card Body */}
                  <div className="p-4">
                    <div className="grid grid-cols-1 gap-3">
                      <DataItem label="MAC Address" value={config.macAddress || 'N/A'} />
                      
                      {info.deviceManufacturer && (
                        <DataItem label="Manufacturer" value={info.deviceManufacturer} />
                      )}
                      
                      {info.deviceOs && (
                        <DataItem label="Operating System" value={info.deviceOs} />
                      )}
                      
                      {config.description && (
                        <DataItem label="Description" value={config.description} />
                      )}
                      
                      {config.lastPort && (
                        <DataItem label="Port" value={config.lastPort} />
                      )}
                      
                      {config.segmentId && config.segmentId !== 'Unknown' && (
                        <DataItem label="Segment" value={config.segmentId} />
                      )}
                      
                      {config.timestamp && (
                        <DataItem 
                          label="Last Updated" 
                          value={new Date(config.timestamp).toLocaleString()} 
                        />
                      )}
                    </div>
                    
                    {/* Location Information */}
                    {(config.siteId !== 'Unknown' || config.buildingId !== 'Unknown' || config.floorId !== 'Unknown') && (
                      <div className="mt-4 pt-4 border-t border-gray-600">
                        <h4 className="text-sm font-medium text-gray-400 mb-2">Location</h4>
                        <div className="grid grid-cols-1 gap-2">
                          {config.siteId !== 'Unknown' && (
                            <DataItem label="Site ID" value={config.siteId} />
                          )}
                          {config.buildingId !== 'Unknown' && (
                            <DataItem label="Building ID" value={config.buildingId} />
                          )}
                          {config.floorId !== 'Unknown' && (
                            <DataItem label="Floor ID" value={config.floorId} />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Raw JSON Data Section */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-bold mb-4 text-white">Raw Client Configuration Data</h2>
        <p className="text-gray-300 mb-6">
          This page displays client configuration information for the tenant. The data is fetched from the Nile API endpoint:
          <code className="ml-2 px-2 py-1 bg-gray-900 rounded text-blue-400">
            https://u1.nile-global.cloud/api/v3/client-configs/tenant/{tenantId}
          </code>
        </p>

        
        {clientData && (
          <div className="relative">
            <pre className="bg-gray-900 p-4 rounded-lg overflow-auto max-h-[600px] text-sm text-gray-300">
              {JSON.stringify(clientData, null, 2)}
            </pre>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(clientData, null, 2));
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
