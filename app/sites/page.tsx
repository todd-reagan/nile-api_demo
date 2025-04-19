'use client';

import Link from 'next/link';
import { useFetch } from '../hooks';
import { fetchSites } from '../services/api';
import { parseSites } from '../utils/dataTransformers';
import { Site, ParsedSite } from '../types';
import { PageLayout, LoadingState, ErrorState, Card, DataItem } from '../components/ui';

export default function SitesPage() {
  const { data: sitesData, loading, error } = useFetch<Site[]>(fetchSites);
  
  // Parse the sites data
  const sites = sitesData ? parseSites(sitesData) : null;

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <DataItem label="Tenant ID" value={site.tenantid} />
              <DataItem label="Site ID" value={site.siteid} />
            </div>
          </Card>
        ))}
      </div>
    </PageLayout>
  );
}
