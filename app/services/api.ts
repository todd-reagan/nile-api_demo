// API service for Nile Mobile Dashboard

import { API_ENDPOINTS, AUTH_API_URL } from '../constants';

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data as T;
}

// Fetch tree structure (tenant hierarchy)
export async function fetchTree(): Promise<import('../types').Tenant> {
  const response = await fetch(API_ENDPOINTS.TREE);
  return handleResponse(response);
}

// Fetch all sites
export async function fetchSites(): Promise<import('../types').Site[]> {
  const response = await fetch(API_ENDPOINTS.SITES);
  return handleResponse(response);
}

// Fetch all buildings
export async function fetchBuildings(): Promise<import('../types').Building[]> {
  const response = await fetch(API_ENDPOINTS.BUILDINGS);
  return handleResponse(response);
}

// Fetch all floors
export async function fetchFloors(): Promise<import('../types').Floor[]> {
  const response = await fetch(API_ENDPOINTS.FLOORS);
  return handleResponse(response);
}

// Fetch all segments
export async function fetchSegments(): Promise<import('../types').Segment[]> {
  const response = await fetch(API_ENDPOINTS.SEGMENTS);
  return handleResponse(response);
}

// Fetch all devices
export async function fetchDevices(): Promise<import('../types').NetworkDevice[]> {
  const response = await fetch(API_ENDPOINTS.DEVICES);
  return handleResponse(response);
}

// Update tenant data
export async function updateTenantData() {
  const response = await fetch(API_ENDPOINTS.TENANT_UPDATE);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const text = await response.text();
  return { success: text.includes('successfully'), message: text };
}

// Authorize device
export interface DeviceAuthorizationParams {
  deviceId: string;
  macAddress: string;
  segmentId: string;
  status: string;
  description: string;
}

export async function authorizeDevice(params: DeviceAuthorizationParams) {
  const response = await fetch(AUTH_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params)
  });
  
  return handleResponse(response);
}
