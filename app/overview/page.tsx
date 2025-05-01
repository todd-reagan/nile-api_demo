'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFetch } from '../hooks';
import { fetchTree } from '../services/api';
import { Tenant, TenantSite, TenantBuilding, TenantFloor } from '../types';
import { PageLayout, LoadingState, ErrorState, Card, DataItem } from '../components/ui';
import { 
  UncontrolledTreeEnvironment, 
  Tree, 
  StaticTreeDataProvider, 
  TreeItemIndex 
} from 'react-complex-tree';
import 'react-complex-tree/lib/style.css';

// Custom styles for the tree view
import styles from './overview.module.css';

// Define our custom tree item interface
interface CustomTreeItem {
  index: TreeItemIndex;
  data: string;
  children?: TreeItemIndex[];
  canMove?: boolean;
  canRename?: boolean;
  hasChildren?: boolean;
  type: 'tenant' | 'site' | 'building' | 'floor';
  id: string;
}

export default function OverviewPage() {
  const { data: tenant, loading, error } = useFetch<Tenant>(fetchTree);
  const [selectedItem, setSelectedItem] = useState<{
    type: 'tenant' | 'site' | 'building' | 'floor';
    id: string;
    data: any;
  } | null>(null);
  const [treeData, setTreeData] = useState<Record<TreeItemIndex, CustomTreeItem>>({});
  const [rootItems, setRootItems] = useState<TreeItemIndex[]>([]);
  const [expandedItems, setExpandedItems] = useState<TreeItemIndex[]>([]);

  // Convert tenant data to tree structure
  useEffect(() => {
    if (tenant) {
      const data: Record<TreeItemIndex, CustomTreeItem> = {};
      const rootItems: TreeItemIndex[] = ['tenant'];
      const expanded: TreeItemIndex[] = ['tenant'];
      
      // Add tenant as root
      data['tenant'] = {
        index: 'tenant',
        data: 'Tenant',
        children: tenant.sites.map(site => `site-${site.siteid}`),
        canMove: false,
        canRename: false,
        hasChildren: tenant.sites.length > 0,
        type: 'tenant',
        id: tenant.tenantid
      };
      
      // Add sites
      tenant.sites.forEach(site => {
        const siteId = `site-${site.siteid}`;
        data[siteId] = {
          index: siteId,
          data: site.name,
          children: site.buildings.map(building => `building-${building.bldgid}`),
          canMove: false,
          canRename: false,
          hasChildren: site.buildings.length > 0,
          type: 'site',
          id: site.siteid
        };
        
        // Add buildings
        site.buildings.forEach(building => {
          const buildingId = `building-${building.bldgid}`;
          data[buildingId] = {
            index: buildingId,
            data: building.name,
            children: building.floors.map(floor => `floor-${floor.floorid}`),
            canMove: false,
            canRename: false,
            hasChildren: building.floors.length > 0,
            type: 'building',
            id: building.bldgid
          };
          
          // Add floors
          building.floors.forEach(floor => {
            const floorId = `floor-${floor.floorid}`;
            data[floorId] = {
              index: floorId,
              data: `${floor.name} (Floor ${floor.number})`,
              canMove: false,
              canRename: false,
              hasChildren: false,
              type: 'floor',
              id: floor.floorid
            };
          });
        });
      });
      
      setTreeData(data);
      setRootItems(rootItems);
      setExpandedItems(expanded);
      
      // Set tenant as initially selected item
      setSelectedItem({
        type: 'tenant',
        id: tenant.tenantid,
        data: tenant
      });
    }
  }, [tenant]);

  // Handle item selection
  const handleItemSelect = (items: TreeItemIndex[]) => {
    if (items.length > 0 && tenant) {
      const itemId = items[0] as string;
      const item = treeData[itemId];
      
      if (item) {
        let itemData = null;
        
        // Find the corresponding data
        if (item.type === 'tenant') {
          itemData = tenant;
        } else if (item.type === 'site') {
          itemData = tenant.sites.find(site => site.siteid === item.id);
        } else if (item.type === 'building') {
          let foundBuilding = null;
          tenant.sites.forEach(site => {
            const building = site.buildings.find(b => b.bldgid === item.id);
            if (building) {
              foundBuilding = { ...building, site };
            }
          });
          itemData = foundBuilding;
        } else if (item.type === 'floor') {
          let foundFloor = null;
          tenant.sites.forEach(site => {
            site.buildings.forEach(building => {
              const floor = building.floors.find(f => f.floorid === item.id);
              if (floor) {
                foundFloor = { ...floor, building, site };
              }
            });
          });
          itemData = foundFloor;
        }
        
        setSelectedItem({
          type: item.type,
          id: item.id,
          data: itemData
        });
      }
    }
  };

  // Render detail panel based on selected item
  const renderDetailPanel = () => {
    if (!selectedItem || !selectedItem.data) {
      return <div className="p-4 text-gray-400">Select an item to view details</div>;
    }
    
    switch (selectedItem.type) {
      case 'tenant':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Tenant Overview</h2>
            <Card title="Tenant Information">
              <DataItem label="Tenant ID" value={selectedItem.data.tenantid} />
              <DataItem label="Sites" value={`${selectedItem.data.sites.length} sites`} />
              <div className="mt-4 pt-4 border-t border-gray-600">
                <p className="text-gray-300">
                  This tenant has {selectedItem.data.sites.length} sites. 
                  Expand the tree on the left to explore sites, buildings, and floors.
                </p>
              </div>
            </Card>
          </div>
        );
        
      case 'site':
        const site = selectedItem.data as TenantSite;
        return (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{site.name}</h2>
              <Link 
                href={`/sites.html?id=${site.siteid}`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm transition-colors"
              >
                View Site Details
              </Link>
            </div>
            
            <Card title="Address Information" className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Address</h3>
              <DataItem label="Street" value={site.address.street1} />
              {site.address.street2 && (
                <DataItem label="Street 2" value={site.address.street2} />
              )}
              <DataItem label="City" value={site.address.city} />
              <DataItem label="State" value={site.address.state} />
              <DataItem label="ZIP" value={site.address.zip} />
              <DataItem label="Country" value={site.address.country} />
              <DataItem label="Timezone" value={site.address.timeZone.timeZoneId} />
            </Card>
            
            <Card title="Buildings">
              <h3 className="text-lg font-semibold mb-2">Buildings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {site.buildings.map(building => (
                  <Link
                    key={building.bldgid}
                    href={`/bldg.html?id=${building.bldgid}`}
                    className="bg-gray-700 hover:bg-gray-600 p-3 rounded transition-colors"
                  >
                    <p className="font-medium">{building.name}</p>
                    <p className="text-sm text-gray-300">{building.floors.length} floors</p>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        );
        
      case 'building':
        const buildingData = selectedItem.data;
        if (!buildingData) return null;
        
        const building = buildingData as TenantBuilding & { site: TenantSite };
        return (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{building.name}</h2>
              <Link 
                href={`/bldg.html?id=${building.bldgid}`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm transition-colors"
              >
                View Building Details
              </Link>
            </div>
            
            <Card title="Location Information" className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Location</h3>
              <DataItem label="Site" value={building.site.name} />
              <DataItem label="Address" value={building.address.street1} />
              {building.address.street2 && (
                <DataItem label="Address Line 2" value={building.address.street2} />
              )}
              <DataItem 
                label="Location" 
                value={`${building.address.city}, ${building.address.state} ${building.address.zip}`} 
              />
              <DataItem label="Country" value={building.address.country} />
              <DataItem label="Timezone" value={building.address.timeZone.timeZoneId} />
            </Card>
            
            <Card title="Floors">
              <h3 className="text-lg font-semibold mb-2">Floors</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {building.floors.map(floor => (
                  <Link
                    key={floor.floorid}
                    href={`/floor.html?id=${floor.floorid}`}
                    className="bg-gray-700 hover:bg-gray-600 p-3 rounded transition-colors"
                  >
                    <p className="font-medium">{floor.name}</p>
                    <p className="text-sm text-gray-300">Floor {floor.number}</p>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        );
        
      case 'floor':
        const floorData = selectedItem.data;
        if (!floorData) return null;
        
        const floor = floorData as TenantFloor & { 
          building: TenantBuilding;
          site: TenantSite;
        };
        return (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{floor.name}</h2>
              <Link 
                href={`/floor.html?id=${floor.floorid}`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm transition-colors"
              >
                View Floor Details
              </Link>
            </div>
            
            <Card title="Floor Information">
              <h3 className="text-lg font-semibold mb-2">Details</h3>
              <DataItem label="Floor Number" value={floor.number} />
              <DataItem label="Building" value={floor.building.name} />
              <DataItem label="Site" value={floor.site.name} />
              
              <div className="mt-4 pt-4 border-t border-gray-600">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Technical Details</h4>
                <DataItem label="Floor ID" value={floor.floorid} />
                <DataItem label="Building ID" value={floor.building.bldgid} />
                <DataItem label="Site ID" value={floor.site.siteid} />
              </div>
            </Card>
          </div>
        );
        
      default:
        return null;
    }
  };

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
      <div className="flex flex-col md:flex-row bg-gray-900 rounded-lg overflow-hidden shadow-xl mb-8">
        {/* Tree View Panel */}
        <div className="w-full md:w-1/3 lg:w-1/4 bg-gray-900 p-4 border-r border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Network Hierarchy</h2>
          
          {Object.keys(treeData).length > 0 && (
            <div className={styles.treeContainer}>
              <UncontrolledTreeEnvironment
                dataProvider={new StaticTreeDataProvider(treeData)}
                getItemTitle={item => (item as any).data}
                viewState={{
                  ['tree-1']: {
                    expandedItems
                  }
                }}
                canDragAndDrop={false}
                canDropOnFolder={false}
                canReorderItems={false}
                onSelectItems={handleItemSelect}
                onExpandItem={(item) => {
                  setExpandedItems([...expandedItems, item as unknown as TreeItemIndex]);
                }}
                onCollapseItem={(item) => {
                  setExpandedItems(expandedItems.filter(i => i !== (item as unknown as TreeItemIndex)));
                }}
                renderItemTitle={({ title, item }) => {
                  const customItem = item as unknown as CustomTreeItem;
                  return (
                    <div className="flex items-center">
                      {customItem.type === 'tenant' && (
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      )}
                      {customItem.type === 'site' && (
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                      {customItem.type === 'building' && (
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      )}
                      {customItem.type === 'floor' && (
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                      <span>{title}</span>
                    </div>
                  );
                }}
              >
                <Tree treeId="tree-1" rootItem="tenant" />
              </UncontrolledTreeEnvironment>
            </div>
          )}
        </div>
        
        {/* Detail Panel */}
        <div className="w-full md:w-2/3 lg:w-3/4 bg-gray-900">
          {renderDetailPanel()}
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card title="Sites" className="bg-blue-900/30 border border-blue-800">
          <h3 className="text-lg font-semibold mb-2">Sites</h3>
          <p className="text-3xl font-bold">{tenant.sites.length}</p>
        </Card>
        
        <Card title="Buildings" className="bg-green-900/30 border border-green-800">
          <h3 className="text-lg font-semibold mb-2">Buildings</h3>
          <p className="text-3xl font-bold">
            {tenant.sites.reduce((total, site) => total + site.buildings.length, 0)}
          </p>
        </Card>
        
        <Card title="Floors" className="bg-purple-900/30 border border-purple-800">
          <h3 className="text-lg font-semibold mb-2">Floors</h3>
          <p className="text-3xl font-bold">
            {tenant.sites.reduce((total, site) => 
              total + site.buildings.reduce((bTotal, building) => 
                bTotal + building.floors.length, 0), 0)}
          </p>
        </Card>
        
        <Card title="Tenant Information" className="bg-orange-900/30 border border-orange-800">
          <h3 className="text-lg font-semibold mb-2">Tenant ID</h3>
          <p className="text-sm font-mono truncate">{tenant.tenantid}</p>
        </Card>
      </div>
    </PageLayout>
  );
}
