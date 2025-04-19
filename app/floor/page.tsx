'use client';

import { useFetch } from '../hooks';
import { fetchFloors } from '../services/api';
import { Floor } from '../types';
import { PageLayout, LoadingState, ErrorState, Card, DataItem } from '../components/ui';

export default function FloorPage() {
  const { data: floors, loading, error } = useFetch<Floor[]>(fetchFloors);

  if (loading) {
    return <LoadingState message="Loading floors..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!floors || floors.length === 0) {
    return <ErrorState title="No Data" message="No floors available" />;
  }

  return (
    <PageLayout title="Floors">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {floors.map((floor) => (
          <Card 
            key={floor.floorid} 
            title={floor.name}
          >
            <DataItem label="Floor Number" value={floor.number} />
            
            <div className="mt-4 pt-4 border-t border-gray-600">
              <DataItem label="Tenant ID" value={floor.tenantid} />
              <DataItem label="Site ID" value={floor.siteid} />
              <DataItem label="Building ID" value={floor.bldgid} />
              <DataItem label="Floor ID" value={floor.floorid} />
            </div>
          </Card>
        ))}
      </div>
    </PageLayout>
  );
}
