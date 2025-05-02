// Common interface definitions for the Nile Mobile Dashboard

export interface TimeZone {
  timeZoneId: string;
}

export interface Address {
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
  timeZone: TimeZone;
}

export interface GeoScope {
  siteIds: string[];
  buildingIds: string[];
  floorIds: string[];
}

// Site interfaces
export interface Site {
  tenantid: string;
  siteid: string;
  name: string;
  address: Address | string; // Can be string when it needs to be parsed
}

export interface ParsedSite {
  tenantid: string;
  siteid: string;
  name: string;
  address: Address;
}

// Building interfaces
export interface Building {
  tenantid: string;
  siteid: string;
  siteName?: string;
  bldgid: string;
  name: string;
  address: Address | string; // Can be string when it needs to be parsed
  floors?: Floor[];
}

export interface ParsedBuilding {
  tenantid: string;
  siteid: string;
  siteName?: string;
  bldgid: string;
  name: string;
  address: Address;
  floors?: Floor[];
}

// Floor interface
export interface Floor {
  tenantid: string;
  siteid: string;
  siteName?: string;
  bldgid: string;
  buildingName?: string;
  floorid: string;
  name: string;
  number: string;
}

// Segment interfaces
export interface SegmentDetails {
  name: string;
  urls: string[];
  popTunnelEnabled: boolean;
  wiredSelfRegisterEnabled: boolean;
  wiredSsoEnabled: boolean;
  wiredGuestEnabled: boolean;
}

export interface SegmentGeoScope {
  siteIds: string[];
  buildingIds: string[];
  zoneIds: string[];
  globalInfo: any[];
}

export interface SegmentSetting {
  type: string;
  id: string;
  location: string;
  extra?: any; // Can be null, array, or object
}

export interface SegmentLinkedSettings {
  globalSettings: any[];
  siteSettings: SegmentSetting[];
  buildingSettings: any[];
  zoneSettings: any[];
}

export interface Segment {
  tenantid: string;
  segment: string;
  id?: string;
  name?: string;
  encrypted?: boolean;
  version?: string;
  useTags?: boolean;
  settingStatus?: string;
  tagIds?: string[];
  segmentDetails?: SegmentDetails;
  geoScope?: SegmentGeoScope;
  linkedSettings?: SegmentLinkedSettings;
}

// Network device interface
export interface NetworkDevice {
  id: string;
  macAddress: string;
  tenantid: string;
  siteid: string;
  buildingid: string;
  floorid: string;
  zoneid: string;
  segmentid: string;
  deviceid: string;
  port: string;
  state: string;
  geoScope: GeoScope;
  authenticatedBy: string;
  staticip: string | null;
  ipaddress: string | null;
}

// Tenant interfaces
export interface Tenant {
  tenantid: string;
  sites: TenantSite[];
}

export interface TenantSite {
  siteid: string;
  name: string;
  address: Address;
  buildings: TenantBuilding[];
}

export interface TenantBuilding {
  bldgid: string;
  name: string;
  address: Address;
  floors: TenantFloor[];
}

export interface TenantFloor {
  floorid: string;
  name: string;
  number: string;
}

export interface TreeItem {
  index: string;
  data: string;
  children?: string[];
  canMove?: boolean;
  canRename?: boolean;
  hasChildren?: boolean;
}

export interface TreeViewData {
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
}

// Dashboard item interface
export interface DashboardItem {
  title: string;
  description: string;
  href: string;
  requiresAuth?: boolean;
}
