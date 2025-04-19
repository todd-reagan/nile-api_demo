'use client';

import { useFetch } from '../hooks';
import { fetchBuildings } from '../services/api';
import { parseBuildings } from '../utils/dataTransformers';
import { Building } from '../types';
import { PageLayout, LoadingState, ErrorState, Card, DataItem } from '../components/ui';

export default function BuildingPage() {
  const { data: buildingsData, loading, error } = useFetch<Building[]>(fetchBuildings);
  
  // Parse the buildings data
  const buildings = buildingsData ? parseBuildings(buildingsData) : null;

  if (loading) {
    return <LoadingState message="Loading buildings..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!buildings || buildings.length === 0) {
    return <ErrorState title="No Data" message="No building information available" />;
  }

  return (
    <PageLayout title="Building Information">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {buildings.map((building) => (
          <Card 
            key={building.bldgid} 
            title={building.name}
            href={`/bldg/${building.bldgid}`}
          >
            <DataItem label="Address" value={building.address.street1} />
            {building.address.street2 && (
              <DataItem label="Address Line 2" value={building.address.street2} />
            )}
            <DataItem 
              label="Location" 
              value={`${building.address.city}, ${building.address.state} ${building.address.zip}`} 
            />
            <DataItem label="Country" value={building.address.country} />
            <DataItem label="Time Zone" value={building.address.timeZone.timeZoneId} />
            <DataItem 
              label="Coordinates" 
              value={`${building.address.latitude}, ${building.address.longitude}`} 
            />
            
            <div className="mt-4 pt-4 border-t border-gray-600">
              <DataItem label="Tenant ID" value={building.tenantid} />
              <DataItem label="Site ID" value={building.siteid} />
              <DataItem label="Building ID" value={building.bldgid} />
            </div>
          </Card>
        ))}
      </div>
    </PageLayout>
  );
}
