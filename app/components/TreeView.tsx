'use client';

import { UncontrolledTreeEnvironment, Tree, StaticTreeDataProvider, TreeItemIndex } from 'react-complex-tree';
import 'react-complex-tree/lib/style.css';
import { useRouter } from 'next/navigation';

interface TreeItem {
  index: TreeItemIndex;
  data: string;
  children?: TreeItemIndex[];
  canMove?: boolean;
  canRename?: boolean;
  hasChildren?: boolean;
}

interface TreeViewProps {
  data: {
    sites: Array<{
      siteId: string;
      name: string;
      buildings: Array<{
        bldgid: string;
        name: string;
        floors: Array<{
          floorid: string;
          name: string;
        }>;
      }>;
    }>;
  };
}

export default function TreeView({ data }: TreeViewProps) {
  const router = useRouter();

  const convertToTreeData = (data: TreeViewProps['data']): Record<TreeItemIndex, TreeItem> => {
    const treeData: Record<TreeItemIndex, TreeItem> = {};
    
    data.sites.forEach(site => {
      treeData[site.siteId] = {
        index: site.siteId,
        data: site.name,
        children: site.buildings.map(building => building.bldgid),
        canMove: false,
        canRename: false,
      };

      site.buildings.forEach(building => {
        treeData[building.bldgid] = {
          index: building.bldgid,
          data: building.name,
          children: building.floors.map(floor => floor.floorid),
          canMove: false,
          canRename: false,
        };

        building.floors.forEach(floor => {
          treeData[floor.floorid] = {
            index: floor.floorid,
            data: floor.name,
            canMove: false,
            canRename: false,
          };
        });
      });
    });

    return treeData;
  };

  const treeData = convertToTreeData(data);
  const dataProvider = new StaticTreeDataProvider(treeData, (item, newName) => ({
    ...item,
    data: newName,
  }));

  const handleItemClick = (itemId: TreeItemIndex) => {
    // Handle navigation based on item type
    if (typeof itemId === 'string') {
      if (itemId.includes('floor')) {
        router.push(`/floor/${itemId}`);
      } else if (itemId.includes('bldg')) {
        router.push(`/bldg/${itemId}`);
      } else if (itemId.includes('site')) {
        router.push(`/sites/${itemId}`);
      }
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <UncontrolledTreeEnvironment
        dataProvider={dataProvider}
        getItemTitle={item => item.data}
        viewState={{}}
        onSelectItems={items => {
          if (items.length > 0) {
            handleItemClick(items[0]);
          }
        }}
      >
        <Tree treeId="tree-1" rootItem="root" treeLabel="Site Structure" />
      </UncontrolledTreeEnvironment>
    </div>
  );
} 