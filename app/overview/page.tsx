'use client';

import { useState, useEffect } from 'react';
import TreeView from '../components/TreeView';
import Link from 'next/link';

interface Address {
  id: string;
  name: string;
  street1: string;
  street2: string | null;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  altitude: number;
  geoRadius: number | null;
  subRegion: string | null;
  country: string;
  zip: string;
  timeZone: {
    timeZoneId: string;
  };
}

interface Site {
  address: string;
  tenantid: string;
  name: string;
  siteid: string;
}

interface Building {
  bldgid: string;
  address: string;
  tenantid: string;
  name: string;
  siteid: string;
}

interface Floor {
  number: number;
  bldgid: string;
  tenantid: string;
  name: string;
  siteid: string;
}

interface TreeTenant {
  tenantId: string;
  name: string;
  sites: Array<{
    siteId: string;
    name: string;
    address: Address;
    buildings: Array<{
      bldgid: string;
      name: string;
      address: Address;
      floors: Array<{
        floorid: string;
        name: string;
        number: number;
      }>;
    }>;
  }>;
}

interface TreeData {
  tenants: TreeTenant[];
}

export default function BuildingPage() {
  const [treeData, setTreeData] = useState<TreeData>({ tenants: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching data from API...');
        const response = await fetch('https://pijdw6hp7r3cr76lrselfxbhza0wmvkj.lambda-url.us-west-2.on.aws/');
        if (!response.ok) {
          throw new Error('Failed to fetch building data');
        }
        const jsonData = await response.json();
        console.log('Raw API response:', jsonData);
        
        // Process the data into the tree structure
        const tenantsMap = new Map<string, TreeTenant>();
        
        // The API returns an array of arrays, where each inner array contains related data
        const [sitesData, buildingsData, floorsData] = jsonData;
        console.log('Separated data:', { sitesData, buildingsData, floorsData });

        // Process sites and create tenant structure
        sitesData.forEach((siteItem: any) => {
          const site = siteItem as Site;
          try {
            const parsedAddress = JSON.parse(site.address) as Address;
            
            // Get or create tenant
            let tenant = tenantsMap.get(site.tenantid);
            if (!tenant) {
              tenant = {
                tenantId: site.tenantid,
                name: `Tenant ${site.tenantid}`,
                sites: []
              };
              tenantsMap.set(site.tenantid, tenant);
            }

            // Add site to tenant
            tenant.sites.push({
              siteId: site.siteid,
              name: site.name,
              address: parsedAddress,
              buildings: []
            });
            console.log('Added site:', site.name, 'to tenant:', tenant.name);
          } catch (parseError) {
            console.error('Error parsing site address:', parseError);
          }
        });

        // Process buildings
        buildingsData.forEach((buildingItem: any) => {
          const building = buildingItem as Building;
          const tenant = tenantsMap.get(building.tenantid);
          if (tenant) {
            const site = tenant.sites.find(s => s.siteId === building.siteid);
            if (site) {
              try {
                const parsedAddress = JSON.parse(building.address) as Address;
                site.buildings.push({
                  bldgid: building.bldgid,
                  name: building.name,
                  address: parsedAddress,
                  floors: []
                });
                console.log('Added building:', building.name, 'to site:', site.name);
              } catch (parseError) {
                console.error('Error parsing building address:', parseError);
              }
            }
          }
        });

        // Process floors
        floorsData.forEach((floorItem: any) => {
          const floor = floorItem as Floor;
          console.log('Processing floor:', floor);
          
          // Find the tenant
          const tenant = tenantsMap.get(floor.tenantid);
          if (tenant) {
            // Find the site
            const site = tenant.sites.find(s => s.siteId === floor.siteid);
            if (site) {
              // Find the building
              const building = site.buildings.find(b => b.bldgid === floor.bldgid);
              if (building) {
                // Add the floor to the building with both name and number
                building.floors.push({
                  floorid: `${floor.bldgid}-${floor.number}`,
                  name: floor.name,
                  number: floor.number
                });
                console.log('Added floor:', floor.name, 'number:', floor.number, 'to building:', building.name);
              } else {
                console.log('Building not found for floor:', floor.bldgid);
              }
            } else {
              console.log('Site not found for floor:', floor.siteid);
            }
          } else {
            console.log('Tenant not found for floor:', floor.tenantid);
          }
        });

        const processedTenants = Array.from(tenantsMap.values());
        console.log('Processed tenants:', JSON.stringify(processedTenants, null, 2));
        
        if (processedTenants.length === 0) {
          throw new Error('No valid tenants found in the response');
        }

        setTreeData({ tenants: processedTenants });
        setError(null);
      } catch (err) {
        console.error('Error in fetchData:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-gray-300">Loading building information...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Building Information</h1>
          <Link 
            href="/" 
            className="text-gray-300 hover:text-white transition-colors duration-200"
          >
            Return to Dashboard
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6">
          {treeData.tenants.map((tenant) => (
            <div key={tenant.tenantId} className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">{tenant.name}</h2>
              <div className="space-y-4">
                {tenant.sites.map((site) => (
                  <div key={site.siteId} className="bg-gray-700 rounded-lg p-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-white mb-2">{site.name}</h3>
                      <div className="text-gray-300">
                        <p className="font-medium">Site Address:</p>
                        <p>{site.address.street1}</p>
                        {site.address.street2 && <p>{site.address.street2}</p>}
                        <p>{site.address.city}, {site.address.state} {site.address.zip}</p>
                        <p>{site.address.country}</p>
                        <p>Timezone: {site.address.timeZone.timeZoneId}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {site.buildings.map((building) => (
                        <div key={building.bldgid} className="bg-gray-600 rounded-lg p-4">
                          <div className="mb-4">
                            <h4 className="text-md font-semibold text-white mb-2">{building.name}</h4>
                            <div className="text-gray-300">
                              <p className="font-medium">Building Address:</p>
                              <p>{building.address.street1}</p>
                              {building.address.street2 && <p>{building.address.street2}</p>}
                              <p>{building.address.city}, {building.address.state} {building.address.zip}</p>
                              <p>{building.address.country}</p>
                            </div>
                          </div>
                          {building.floors.length > 0 && (
                            <div className="bg-gray-500 rounded-lg p-3">
                              <h5 className="text-sm font-semibold text-white mb-2">Floors:</h5>
                              <div className="space-y-2">
                                {building.floors.map((floor) => (
                                  <div key={floor.floorid} className="text-gray-300 pl-4 border-l-2 border-gray-400">
                                    <p className="font-medium">{floor.name} (Floor {floor.number})</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 