'use client';

import { getJwtToken } from './auth';
import { ApiKey } from './auth';

// Replace this with your actual API Gateway endpoint URL after deployment
const API_ENDPOINT = 'https://ofthddzjjh.execute-api.us-west-2.amazonaws.com/prod/api-keys';

/**
 * Extract user ID from JWT token
 * @param token JWT token
 * @returns User ID or null if not found
 */
function extractUserIdFromToken(token: string): string | null {
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(atob(tokenParts[1]));
      
      // Try to get user ID from cognito:username claim first (Cognito's default)
      let userId = payload['cognito:username'];
      
      // If not found, try the sub claim as fallback
      if (!userId) {
        userId = payload.sub;
      }
      
      console.log('Extracted user ID from token:', userId);
      return userId;
    }
  } catch (error) {
    console.error('Error extracting user ID from token:', error);
  }
  return null;
}

/**
 * Fetch all API keys for the current user
 * @returns Array of API keys
 */
export async function fetchApiKeys(): Promise<ApiKey[]> {
  const token = await getJwtToken();
  if (!token) {
    throw new Error('User is not authenticated');
  }

  // Extract user ID from token
  const userId = extractUserIdFromToken(token);

  // Include userId as a query parameter
  const url = new URL(API_ENDPOINT);
  if (userId) {
    url.searchParams.append('userId', userId);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch API keys: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Map the DynamoDB items to our ApiKey interface
  return data.apiKeys.map((item: any) => ({
    id: item.keyId,
    name: item.name,
    key: item.key,
    service: item.service,
    url: item.url,
    validBefore: item.validBefore,
    tenantId: item.tenantId
  }));
}

/**
 * Create a new API key
 * @param name User-friendly name for the API key
 * @param key The actual API key value
 * @param service The service the API key is for
 * @param url Optional URL for the API key
 * @param validBefore Optional expiration date in ISO format
 * @param tenantId Optional tenant identifier
 * @returns The created API key
 */
export async function createApiKey(
  name: string, 
  key: string, 
  service: string, 
  url?: string, 
  validBefore?: string,
  tenantId?: string
): Promise<ApiKey> {
  const token = await getJwtToken();
  if (!token) {
    throw new Error('User is not authenticated');
  }

  // Extract user ID from token using our helper function
  const userId = extractUserIdFromToken(token);

  // Include the user ID in the request body as a fallback
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      name, 
      key, 
      service,
      url,
      validBefore,
      tenantId,
      userId // Include the user ID in the request body
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to create API key: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Map the DynamoDB item to our ApiKey interface
  return {
    id: data.keyId,
    name: data.name,
    key: data.key,
    service: data.service,
    url: data.url,
    validBefore: data.validBefore,
    tenantId: data.tenantId
  };
}

/**
 * Update an existing API key
 * @param id The unique identifier for the API key
 * @param name User-friendly name for the API key
 * @param key The actual API key value
 * @param service The service the API key is for
 * @param url Optional URL for the API key
 * @param validBefore Optional expiration date in ISO format
 * @param tenantId Optional tenant identifier
 * @returns The updated API key
 */
export async function updateApiKey(
  id: string, 
  name: string, 
  key: string, 
  service: string,
  url?: string,
  validBefore?: string,
  tenantId?: string
): Promise<ApiKey> {
  const token = await getJwtToken();
  if (!token) {
    throw new Error('User is not authenticated');
  }

  // Extract user ID from token
  const userId = extractUserIdFromToken(token);

  const response = await fetch(API_ENDPOINT, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      keyId: id, 
      name, 
      key, 
      service,
      url,
      validBefore,
      tenantId,
      userId // Include the user ID in the request body
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to update API key: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Map the DynamoDB item to our ApiKey interface
  return {
    id: data.keyId,
    name: data.name,
    key: data.key,
    service: data.service,
    url: data.url,
    validBefore: data.validBefore,
    tenantId: data.tenantId
  };
}

/**
 * Delete an API key
 * @param id The unique identifier for the API key
 */
export async function deleteApiKey(id: string): Promise<void> {
  const token = await getJwtToken();
  if (!token) {
    throw new Error('User is not authenticated');
  }

  // Extract user ID from token
  const userId = extractUserIdFromToken(token);

  // Include userId as a query parameter
  const url = new URL(API_ENDPOINT);
  url.searchParams.append('keyId', id);
  if (userId) {
    url.searchParams.append('userId', userId);
  }

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to delete API key: ${response.statusText}`);
  }
}
