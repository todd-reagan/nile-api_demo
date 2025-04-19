// API URLs
export const API_BASE_URL = 'https://ofthddzjjh.execute-api.us-west-2.amazonaws.com/prod';
export const AUTH_API_URL = 'https://r734rgw5dju6ibxoyx47totfgm0mtxeu.lambda-url.us-west-2.on.aws/';

// API Endpoints
export const API_ENDPOINTS = {
  TREE: `${API_BASE_URL}/tree`,
  SITES: `${API_BASE_URL}/sites`,
  BUILDINGS: `${API_BASE_URL}/bldgs`,
  FLOORS: `${API_BASE_URL}/floors`,
  SEGMENTS: `${API_BASE_URL}/segments`,
  DEVICES: `${API_BASE_URL}/devices`,
  TENANT_UPDATE: `${API_BASE_URL}/tenantupdate`,
};

// Status options for device authorization
export const DEVICE_STATUS_OPTIONS = [
  { value: 'Status', label: 'Status', disabled: true },
  { value: 'Approved', label: 'Approved' },
  { value: 'Denied', label: 'Denied' },
];

// Navigation items for the dashboard
export const DASHBOARD_ITEMS = [
  {
    title: 'Overview',
    description: 'View tenant hierarchy',
    href: '/overview.html',
  },
  {
    title: 'Site Information',
    description: 'View Site details',
    href: '/sites.html',
  },
  {
    title: 'Building Information',
    description: 'View building details',
    href: '/bldg.html',
  },
  {
    title: 'Floor Information',
    description: 'View floor details',
    href: '/floor.html',
  },
  {
    title: 'Network Segments',
    description: 'View network segments details',
    href: '/segments.html',
  },
  {
    title: 'Devices Needing Approval',
    description: 'View device details waiting for approval',
    href: '/devices.html',
  },
  {
    title: 'Update Database Data',
    description: 'Refresh and update all database information',
    href: '/update.html',
  },
];
