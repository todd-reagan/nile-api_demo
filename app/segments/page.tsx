
'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useFetch } from '../hooks';
import { fetchSegments, fetchSites } from '../services/api';
import { Segment, Site } from '../types';
import { PageLayout, LoadingState, ErrorState, Card, DataItem } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

export default function SegmentsPage() {
  const { data: segments, loading, error } = useFetch<Segment[]>(fetchSegments);
  const { data: sites, loading: sitesLoading } = useFetch<Site[]>(fetchSites);
  const { apiKeys } = useAuth();
  const [rawSegmentsData, setRawSegmentsData] = useState<any>(null);
  const [rawDataLoading, setRawDataLoading] = useState<boolean>(false);
  const [rawDataError, setRawDataError] = useState<string | null>(null);
  const [expandedSegments, setExpandedSegments] = useState<Record<string, boolean>>({});
  const [siteMap, setSiteMap] = useState<Record<string, string>>({});
  const [siteColorMap, setSiteColorMap] = useState<Record<string, string>>({});
  
  // Create a map of site IDs to site names and generate colors
  useEffect(() => {
    if (sites) {
      const map: Record<string, string> = {};
      const colorMap: Record<string, string> = {};
      
      // Define a set of distinct colors for sites
      const colors = [
        'bg-blue-900/50', 'bg-green-900/50', 'bg-purple-900/50', 
        'bg-red-900/50', 'bg-yellow-900/50', 'bg-indigo-900/50',
        'bg-pink-900/50', 'bg-teal-900/50', 'bg-orange-900/50'
      ];
      
      sites.forEach((site, index) => {
        map[site.siteid] = site.name;
        // Assign a color from the colors array, cycling through if needed
        colorMap[site.siteid] = colors[index % colors.length];
      });
      
      setSiteMap(map);
      setSiteColorMap(colorMap);
    }
  }, [sites]);
  
  // Toggle expanded state for a segment
  const toggleSegmentExpanded = useCallback((segmentId: string) => {
    setExpandedSegments(prev => ({
      ...prev,
      [segmentId]: !prev[segmentId]
    }));
  }, []);

  // Fetch raw segments data from Nile API with retry logic
  useEffect(() => {
    const fetchRawSegmentsData = async () => {
      setRawDataLoading(true);
      setRawDataError(null);
      
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
          setRawDataError('No API keys found. Please add a Nile API key in your profile.');
          setRawDataLoading(false);
          return;
        }

        // Check for the required scope
        try {
          const decodedToken = JSON.parse(atob(nileApiKey.key.split('.')[1]));
          if (!decodedToken.scope || !decodedToken.scope.includes('settings:read')) {
            setRawDataError('The provided API key does not have the required "settings:read" scope.');
            setRawDataLoading(false);
            return;
          }
        } catch (e) {
          // Could not decode API key as JWT, proceeding without scope check.
        }

        const token = nileApiKey.key;
        const url = 'https://u1.nile-global.cloud/api/v1/settings/segments';
        
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
            
            // If response is 401 or 400, retry with backoff
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
        
        setRawSegmentsData(responseData);
      } catch (err) {
        console.error('Error fetching raw segments data:', err);
        setRawDataError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setRawDataLoading(false);
      }
    };
    
    if (apiKeys.length > 0) {
      fetchRawSegmentsData();
    }
  }, [apiKeys]);

  if (loading || sitesLoading) {
    return <LoadingState message="Loading segments..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!segments || segments.length === 0) {
    return <ErrorState title="No Data" message="No segments available" />;
  }

  // Group segments by tenant ID
  const segmentsByTenant: Record<string, Segment[]> = {};
  segments.forEach(segment => {
    if (!segmentsByTenant[segment.tenantid]) {
      segmentsByTenant[segment.tenantid] = [];
    }
    segmentsByTenant[segment.tenantid].push(segment);
  });

  return (
    <PageLayout title="Network Segments">
      <div className="space-y-8 mb-8">
        {Object.entries(segmentsByTenant).map(([tenantId, tenantSegments]) => (
          <div key={tenantId} className="bg-gray-800 rounded-lg shadow-md p-6">
            {/* Tenant Information - Removed */}
            {/* 
            <h2 className="text-2xl font-semibold mb-4">
              Tenant: {tenantId}
            </h2> 
            */}

            {/* Segments Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-1/4">Segment Name</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
                    {/* <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Encrypted</th> */}
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Version</th>
                    {/* <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Site Settings</th> */}
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">URLs</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {tenantSegments.map((segment) => {
                    const segmentKey = segment.id || segment.segment; // Use ID if available, else name as key
                    const isExpanded = expandedSegments[segmentKey] || false;
                    const hasSiteSettings = segment.linkedSettings?.siteSettings && 
                                            segment.linkedSettings.siteSettings.some(setting => setting.extra && Array.isArray(setting.extra) && setting.extra.length > 0);
                    const hasUrls = segment.segmentDetails?.urls && segment.segmentDetails.urls.length > 0;

                    return (
                      <>
                        <tr key={segmentKey} className="hover:bg-gray-700">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">{segment.segment || 'N/A'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{segment.id || 'N/A'}</td>
                          {/* <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{segment.encrypted ? 'Yes' : 'No'}</td> */}
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{segment.version || 'N/A'}</td>
                          {/* <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{hasSiteSettings ? 'Yes' : 'No'}</td> */}
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{hasUrls ? 'Yes' : 'No'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => toggleSegmentExpanded(segmentKey)}
                              className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-white font-medium"
                            >
                              {isExpanded ? 'Hide Details' : 'View Details'}
                            </button>
                          </td>
                        </tr>
                        {/* Expanded Row for Details */}
                        {isExpanded && (
                          <tr key={`${segmentKey}-details`} className="bg-gray-750">
                            <td colSpan={5} className="px-4 py-4"> {/* Adjusted colSpan to 5 */}
                              <div className="space-y-4">
                                {/* Site Settings Detail */}
                                {hasSiteSettings && (
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-300 mb-1">Site Settings</h4>
                                    <div className="text-xs text-gray-300 space-y-1">
                                      {segment.linkedSettings!.siteSettings!
                                        .filter(setting => setting.extra && Array.isArray(setting.extra) && setting.extra.length > 0)
                                        .map((setting, index) => (
                                          <div key={index} className="bg-gray-800 px-2 py-1 rounded">
                                            {setting.location && (
                                              <div className="mb-1">
                                                <span className={`text-xs ${siteColorMap[setting.location] || 'bg-gray-600'} px-2 py-0.5 rounded inline-block mb-1`}>
                                                  {siteMap[setting.location] || setting.location}
                                                </span>
                                                <span className="font-medium ml-2">{setting.type}</span>
                                              </div>
                                            )}
                                            {setting.extra && Array.isArray(setting.extra) && (
                                              <div className="pl-2 border-l border-gray-600">
                                                {setting.extra.map((item, i) => (
                                                  <div key={i} className="text-gray-400">{item}</div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}
                                {/* URLs Detail */}
                                {hasUrls && (
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-300 mb-1">URLs</h4>
                                    <div className="max-h-32 overflow-y-auto space-y-1">
                                      {segment.segmentDetails!.urls!.map((url, index) => (
                                        <div key={index} className="text-xs bg-gray-800 px-2 py-1 rounded truncate">
                                          {url}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {!hasSiteSettings && !hasUrls && (
                                   <p className="text-sm text-gray-400">No additional details available for this segment.</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      
      {/* Raw JSON Data Section */}
      <div className="mt-12 bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-bold mb-4 text-white">Raw API Response</h2>
        <p className="text-gray-300 mb-6">
          This section displays the raw JSON response from the Nile API endpoint: 
          <code className="ml-2 px-2 py-1 bg-gray-900 rounded text-blue-400">
            https://u1.nile-global.cloud/api/v1/settings/segments
          </code>
        </p>
        
        {rawDataLoading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-300">Loading raw data...</span>
          </div>
        )}
        
        {rawDataError && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-red-400 mb-2">Error Loading Raw Data</h3>
            <p className="text-gray-300">{rawDataError}</p>
            {rawDataError.includes('API key') && (
              <div className="mt-3 text-sm text-gray-400">
                <p>To add an API key:</p>
                <ol className="list-decimal list-inside mt-1">
                  <li>Go to your <Link href="/profile" className="text-blue-400 hover:underline">Profile</Link></li>
                  <li>Click "Add API Key"</li>
                  <li>Enter a name, your Nile API key, and "Nile" as the service</li>
                </ol>
              </div>
            )}
          </div>
        )}
        
        {!rawDataLoading && !rawDataError && rawSegmentsData && (
          <div className="relative">
            <pre className="bg-gray-900 p-4 rounded-lg overflow-auto max-h-[600px] text-sm text-gray-300">
              {JSON.stringify(rawSegmentsData, null, 2)}
            </pre>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(rawSegmentsData, null, 2));
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
