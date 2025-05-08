// API service for Nile Mobile Dashboard

import { API_ENDPOINTS, AUTH_API_URL } from '../constants';
import { getJwtToken, getUserApiKeys } from './auth';
import { ApiKey } from './auth';

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data as T;
}

// Helper function to get the API key and tenant ID from the user profile
async function getApiKeyAndTenantId(): Promise<{ apiKey: string | null; tenantId: string | null }> {
  try {
    // Get all API keys for the user
    const apiKeys = await getUserApiKeys();
    
    // Find the first API key with a tenant ID
    const apiKeyWithTenant = apiKeys.find(key => key.tenantId);
    
    if (apiKeyWithTenant) {
      return {
        apiKey: apiKeyWithTenant.key,
        tenantId: apiKeyWithTenant.tenantId || null
      };
    }
    
    // If no API key with tenant ID is found, return the first API key
    if (apiKeys.length > 0) {
      return {
        apiKey: apiKeys[0].key,
        tenantId: null
      };
    }
    
    // If no API keys are found, return null for both
    return {
      apiKey: null,
      tenantId: null
    };
  } catch (error) {
    console.error('Error getting API key and tenant ID:', error);
    return {
      apiKey: null,
      tenantId: null
    };
  }
}

// Helper function to get the headers for API requests
async function getApiHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  
  // Add JWT token if available
  const token = await getJwtToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Add API key and tenant ID if available
  const { apiKey, tenantId } = await getApiKeyAndTenantId();
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }
  if (tenantId) {
    headers['x-tenant-id'] = tenantId;
  }
  
  return headers;
}

// Fetch tree structure (tenant hierarchy)
export async function fetchTree(): Promise<import('../types').Tenant> {
  const headers = await getApiHeaders();
  const response = await fetch(API_ENDPOINTS.TREE, { headers });
  return handleResponse(response);
}

// Fetch all sites
export async function fetchSites(): Promise<import('../types').Site[]> {
  const headers = await getApiHeaders();
  const response = await fetch(API_ENDPOINTS.SITES, { headers });
  return handleResponse(response);
}

// Fetch all buildings
export async function fetchBuildings(): Promise<import('../types').Building[]> {
  const headers = await getApiHeaders();
  const response = await fetch(API_ENDPOINTS.BUILDINGS, { headers });
  return handleResponse(response);
}

// Fetch all floors
export async function fetchFloors(): Promise<import('../types').Floor[]> {
  const headers = await getApiHeaders();
  const response = await fetch(API_ENDPOINTS.FLOORS, { headers });
  return handleResponse(response);
}

// Fetch all segments
export async function fetchSegments(): Promise<import('../types').Segment[]> {
  const headers = await getApiHeaders();
  const response = await fetch(API_ENDPOINTS.SEGMENTS, { headers });
  return handleResponse(response);
}

// Fetch all devices
export async function fetchDevices(): Promise<import('../types').NetworkDevice[]> {
  const headers = await getApiHeaders();
  const response = await fetch(API_ENDPOINTS.DEVICES, { headers });
  return handleResponse(response);
}

// Update tenant data
export async function updateTenantData() {
  const headers = await getApiHeaders();
  const response = await fetch(API_ENDPOINTS.TENANT_UPDATE, { headers });
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
  const headers = await getApiHeaders();

  // Map frontend status to Lambda state
  let lambdaState: string;
  if (params.status === 'Approved') {
    lambdaState = 'AUTH_OK';
  } else if (params.status === 'Denied') {
    lambdaState = 'AUTH_DENIED';
  } else {
    // Handle unexpected status, or throw error
    console.error('Invalid status for authorization:', params.status);
    throw new Error(`Invalid status provided: ${params.status}`);
  }

  // Prepare payload for the Lambda function
  // The deviceId from the URL is the clientId for the MAB entry.
  // The macAddress from the URL is the macAddress.
  const payload = {
    clientId: params.deviceId, // deviceId from URL is the client's unique ID
    macAddress: params.macAddress,
    segmentId: params.segmentId,
    state: lambdaState,
    description: params.description // Include description from params
  };

  const response = await fetch(AUTH_API_URL, {
    method: 'PATCH', // Changed from POST to PATCH
    headers,
    body: JSON.stringify(payload) // Send the transformed payload
  });
  
  return handleResponse(response);
}
