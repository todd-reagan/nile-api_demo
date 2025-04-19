'use client';

import Link from 'next/link';
import { useFetch } from '../hooks';
import { fetchTree } from '../services/api';
import { Tenant, TenantSite, TenantBuilding, TenantFloor } from '../types';
import { PageLayout, LoadingState, ErrorState, Card, DataItem } from '../components/ui';

export default function OverviewPage() {
  const { data: tenant, loading, error } = useFetch<Tenant>(fetchTree);

  if (loading) {
    return <LoadingState message="Loading network overview..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!tenant) {
    return <ErrorState title="No Data" message="No data available" />;
  }

  return (
    <PageLayout title="Network Overview">
      {/* Tenant Information */}
      <Card title="Tenant" className="mb-8">
        <DataItem label="Tenant ID" value={tenant.tenantid} />
      </Card>

      {/* Sites */}
      <div className="space-y-8">
        {tenant.sites.map((site) => (
          <div key={site.siteid} className="bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">
              <Link href={`/sites.html?id=${site.siteid}`} className="hover:text-blue-400 transition-colors duration-200">
                {site.name}
              </Link>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Address</h3>
                <DataItem label="" value={site.address.street1} />
                <DataItem label="" value={`${site.address.city}, ${site.address.state} ${site.address.zip}`} />
                <DataItem label="" value={site.address.country} />
              </div>
              <div>
                <h3 className="text-lg font-medium mb-2">Timezone</h3>
                <DataItem label="" value={site.address.timeZone.timeZoneId} />
              </div>
            </div>

            {/* Buildings */}
            <div className="space-y-4">
              {site.buildings.map((building: TenantBuilding) => (
                <div key={building.bldgid} className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-xl font-semibold mb-3">
                    <Link href={`/bldg.html?id=${building.bldgid}`} className="hover:text-blue-400 transition-colors duration-200">
                      {building.name}
                    </Link>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-md font-medium mb-2">Address</h4>
                      <DataItem label="" value={building.address.street1} />
                      <DataItem label="" value={`${building.address.city}, ${building.address.state} ${building.address.zip}`} />
                      <DataItem label="" value={building.address.country} />
                    </div>
                    <div>
                      <h4 className="text-md font-medium mb-2">Timezone</h4>
                      <DataItem label="" value={building.address.timeZone.timeZoneId} />
                    </div>
                  </div>

                  {/* Floors */}
                  <div className="space-y-2">
                    <h4 className="text-md font-medium">Floors</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {building.floors.map((floor: TenantFloor) => (
                        <Link
                          key={floor.floorid}
                          href={`/floor.html?id=${floor.floorid}`}
                          className="bg-gray-600 rounded p-2 hover:bg-gray-500 transition-colors duration-200"
                        >
                          <p className="font-medium">{floor.name}</p>
                          <p className="text-sm text-gray-300">Floor {floor.number}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
