import { DashboardItem } from '../types';

// API URLs
// NOTE: In a production environment, these values should be loaded from environment variables
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://ofthddzjjh.execute-api.us-west-2.amazonaws.com/prod';
// AUTH_API_URL will now be derived from API_BASE_URL
// Ensure your API Gateway has a resource like /mabupdate that routes PATCH to the nileMABUpdate Lambda
export const AUTH_API_URL = `${API_BASE_URL}/mabupdate`; 

// API Endpoints
export const API_KEYS_ENDPOINT = process.env.NEXT_PUBLIC_API_KEYS_ENDPOINT || 'https://api.example.com/prod/api-keys';

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
export const DASHBOARD_ITEMS: DashboardItem[] = [
  {
    title: 'Overview',
    description: 'View tenant hierarchy',
    href: '/overview',
    requiresAuth: true,
  },
  {
    title: 'Site Information',
    description: 'View Site details',
    href: '/sites',
    requiresAuth: true,
  },
  {
    title: 'Building Information',
    description: 'View building details',
    href: '/bldg',
    requiresAuth: true,
  },
  {
    title: 'Floor Information',
    description: 'View floor details',
    href: '/floor',
    requiresAuth: true,
  },
  {
    title: 'Network Segments',
    description: 'View network segments details',
    href: '/segments',
    requiresAuth: true,
  },
  {
    title: 'Client Information',
    description: 'View client configuration details',
    href: '/clients',
    requiresAuth: true,
  },
  {
    title: 'Devices Needing Approval',
    description: 'View device details waiting for approval',
    href: '/devices',
    requiresAuth: true,
  },
  {
    title: 'Port Viewer',
    description: 'Visualize switch port connectivity',
    href: '/port-viewer',
    requiresAuth: true,
  },
  {
    title: 'Update Database Data',
    description: 'Refresh and update all database information',
    href: '/update',
    requiresAuth: true,
  },
  {
    title: 'User Profile',
    description: 'Manage your profile and API keys',
    href: '/profile',
    requiresAuth: true,
  },
];
