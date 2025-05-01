'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useFetch } from '../hooks';
import { fetchSites } from '../services/api';
import { parseSites } from '../utils/dataTransformers';
import { Site, ParsedSite } from '../types';
import { PageLayout, LoadingState, ErrorState, Card, DataItem } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

export default function SitesPage() {
  const { data: sitesData, loading, error } = useFetch<Site[]>(fetchSites);
  const { apiKeys } = useAuth();
  const [rawSitesData, setRawSitesData] = useState<any>(null);
  const [rawDataLoading, setRawDataLoading] = useState<boolean>(false);
  const [rawDataError, setRawDataError] = useState<string | null>(null);
  
  // Parse the sites data
  const sites = sitesData ? parseSites(sitesData) : null;

  // Fetch raw sites data from Nile API with retry logic
  useEffect(() => {
    const fetchRawSitesData = async () => {
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

        const token = nileApiKey.key;
        const url = 'https://u1.nile-global.cloud/api/v1/sites';
        
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
        
        setRawSitesData(responseData);
      } catch (err) {
        console.error('Error fetching raw sites data:', err);
        setRawDataError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setRawDataLoading(false);
      }
    };
    
    if (apiKeys.length > 0) {
      fetchRawSitesData();
    }
  }, [apiKeys]);

  if (loading) {
    return <LoadingState message="Loading sites..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!sites || sites.length === 0) {
    return <ErrorState title="No Data" message="No sites found" />;
  }

  return (
    <PageLayout title="Site Information">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {sites.map((site) => (
          <Card 
            key={site.siteid} 
            title={site.name}
            href={`/sites/${site.siteid}`}
          >
            <DataItem label="Address" value={site.address.street1} />
            {site.address.street2 && (
              <DataItem label="Address Line 2" value={site.address.street2} />
            )}
            <DataItem 
              label="Location" 
              value={`${site.address.city}, ${site.address.state} ${site.address.zip}`} 
            />
            <DataItem label="Country" value={site.address.country} />
            <DataItem label="Time Zone" value={site.address.timeZone.timeZoneId} />
            <DataItem 
              label="Coordinates" 
              value={`${site.address.latitude}, ${site.address.longitude}`} 
            />
            
            <div className="mt-4 pt-4 border-t border-gray-600">
              {/* Technical IDs */}
              <h4 className="text-sm font-medium text-gray-400 mb-2">Technical Details</h4>
              <DataItem label="Tenant ID" value={site.tenantid} />
              <DataItem label="Site ID" value={site.siteid} />
            </div>
          </Card>
        ))}
      </div>
      
      {/* Raw JSON Data Section */}
      <div className="mt-12 bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-bold mb-4 text-white">Raw API Response</h2>
        <p className="text-gray-300 mb-6">
          This section displays the raw JSON response from the Nile API endpoint: 
          <code className="ml-2 px-2 py-1 bg-gray-900 rounded text-blue-400">
            https://u1.nile-global.cloud/api/v1/sites
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
        
        {!rawDataLoading && !rawDataError && rawSitesData && (
          <div className="relative">
            <pre className="bg-gray-900 p-4 rounded-lg overflow-auto max-h-[600px] text-sm text-gray-300">
              {JSON.stringify(rawSitesData, null, 2)}
            </pre>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(rawSitesData, null, 2));
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
