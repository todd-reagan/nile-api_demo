"""
Utility functions for making API requests to external services.
"""

import json
import logging
import random
import time
from typing import Dict, Any, Optional, List, Union

import urllib3

# Configure logging
logger = logging.getLogger()

class NileApiClient:
    """Client for making requests to Nile API endpoints."""
    
    def __init__(self, api_key: Optional[str] = None, tenant_id: Optional[str] = None):
        """
        Initialize the Nile API client.
        
        Args:
            api_key: The API key to use for authentication
            tenant_id: The tenant ID to use for querying data
        """
        self.url = "https://u1.nile-global.cloud"  # Default URL for Nile API
        self.api_token = api_key
        self.tenant_id = tenant_id
        self.http = urllib3.PoolManager()
        
    def validate_credentials(self) -> None:
        """
        Validate that API key and tenant ID are provided.
        
        Raises:
            Exception: If API key or tenant ID is not provided
        """
        if not self.api_token:
            raise Exception("API key is required. Please provide it in the x-api-key header.")
            
        if not self.tenant_id:
            raise Exception("Tenant ID is required. Please provide it in the x-tenant-id header.")
    
    def get_headers(self) -> Dict[str, str]:
        """
        Get headers for API requests.
        
        Returns:
            Headers dictionary
        """
        return {
            'Authorization': f'Bearer {self.api_token}',
            'x-tenant-id': self.tenant_id
        }
    
    def make_request(self, endpoint: str, method: str = "GET", max_retries: int = 5) -> Dict[str, Any]:
        """
        Make a request to the Nile API with retry logic.
        
        Args:
            endpoint: The API endpoint to call
            method: The HTTP method to use
            max_retries: Maximum number of retries for 401 responses
            
        Returns:
            Parsed JSON response
            
        Raises:
            Exception: If the request fails
        """
        self.validate_credentials()
        
        headers = self.get_headers()
        final_url = f"{self.url}{endpoint}"
        
        logger.info(f"Request URL: {final_url}")
        logger.info(f"Request headers: {headers}")
        
        # Add retry logic for 401 responses
        retry_count = 0
        response = None
        
        while retry_count <= max_retries:
            if retry_count > 0:
                # Calculate random backoff time between 1 and 5 seconds
                backoff = random.uniform(1, 5)
                logger.info(f"Retry {retry_count}/{max_retries} after {backoff:.2f} seconds backoff")
                time.sleep(backoff)
            
            # Add timeout to the request
            response = self.http.request(
                method, 
                final_url, 
                headers=headers,
                timeout=30.0,  # 30 second timeout
                retries=3      # Retry up to 3 times for network issues
            )
            
            logger.info(f"Response received. Status: {response.status}")
            
            # If response is 401, retry with backoff
            if response.status == 401:
                retry_count += 1
                if retry_count <= max_retries:
                    logger.warning(f"Received 401 Unauthorized, will retry ({retry_count}/{max_retries})")
                    continue
                else:
                    logger.error(f"Received 401 Unauthorized, max retries ({max_retries}) exceeded")
            else:
                # For non-401 responses, break the loop
                break
        
        # Try to decode the response data
        response_data = response.data.decode('utf-8')
        logger.info(f"Response data preview: {response_data[:200]}...")  # Print first 200 chars
        
        if response.status != 200:
            logger.error(f"HTTP error: {response.status}")
            logger.error(f"Response data: {response_data[:1000]}")  # Log more of the response
            raise Exception(f"HTTP error occurred: status code {response.status}, response: {response_data[:500]}")

        content_type = response.headers.get('Content-Type', '')
        logger.info(f"Content-Type: {content_type}")
        
        if "application/json" not in content_type:
            logger.error(f"Non-JSON response: {content_type}")
            logger.error(f"Response data: {response_data[:1000]}")
            raise Exception(f"Response is not JSON. Content-Type: {content_type}, response: {response_data[:500]}")

        logger.info("Parsing JSON response")
        try:
            data = json.loads(response_data)
            logger.info(f"Data type: {type(data)}")
            return data
        except json.JSONDecodeError as err:
            logger.error(f"JSON decode error: {err}", exc_info=True)
            logger.error(f"Raw response data: {response_data[:1000]}")
            raise Exception(f"Error decoding JSON response: {err}. Raw data: {response_data[:500]}") from err
    
    def get_segments(self) -> List[Dict[str, Any]]:
        """
        Get network segments from the Nile API.
        
        Returns:
            List of segment objects
            
        Raises:
            Exception: If the request fails
        """
        data = self.make_request("/api/v1/settings/segments")
        
        # Check if 'data' key exists in the response
        if 'data' not in data:
            logger.error("No 'data' key in response")
            logger.error(f"Response keys: {list(data.keys())}")
            raise Exception(f"Unexpected response format: 'data' key missing. Response: {data}")
            
        # Check if 'content' key exists in the 'data' object
        if 'content' not in data['data']:
            logger.error("No 'content' key in data object")
            logger.error(f"Data keys: {list(data['data'].keys())}")
            raise Exception(f"Unexpected response format: 'content' key missing. Response: {data['data']}")
            
        result = data['data']['content']
        logger.info(f"Found {len(result)} segments in response")

        if not result:
            logger.warning("No segments found in response")
            raise Exception("No network segments found for this tenant.")
            
        return result
    
    def get_sites(self) -> List[Dict[str, Any]]:
        """
        Get sites from the Nile API.
        
        Returns:
            List of site objects
            
        Raises:
            Exception: If the request fails
        """
        data = self.make_request("/api/v1/sites")
        
        # Check if 'content' key exists in the response
        if 'content' not in data:
            logger.error("No 'content' key in response")
            logger.error(f"Response keys: {list(data.keys())}")
            raise Exception(f"Unexpected response format: 'content' key missing. Response: {data}")
            
        result = data['content']
        logger.info(f"Found {len(result)} sites in response")
        
        if not result:
            logger.warning("No sites found in response")
            raise Exception("No sites found for this tenant.")
            
        return result
    
    def get_buildings(self) -> List[Dict[str, Any]]:
        """
        Get buildings from the Nile API.
        
        Returns:
            List of building objects
            
        Raises:
            Exception: If the request fails
        """
        data = self.make_request("/api/v1/buildings")
        
        # Check if 'content' key exists in the response
        if 'content' not in data:
            logger.error("No 'content' key in response")
            logger.error(f"Response keys: {list(data.keys())}")
            raise Exception(f"Unexpected response format: 'content' key missing. Response: {data}")
            
        result = data['content']
        logger.info(f"Found {len(result)} buildings in response")
        
        if not result:
            logger.warning("No buildings found in response")
            raise Exception("No buildings found for this tenant.")
            
        return result
    
    def get_floors(self) -> List[Dict[str, Any]]:
        """
        Get floors from the Nile API.
        
        Returns:
            List of floor objects
            
        Raises:
            Exception: If the request fails
        """
        data = self.make_request("/api/v1/floors")
        
        # Check if 'content' key exists in the response
        if 'content' not in data:
            logger.error("No 'content' key in response")
            logger.error(f"Response keys: {list(data.keys())}")
            raise Exception(f"Unexpected response format: 'content' key missing. Response: {data}")
            
        result = data['content']
        logger.info(f"Found {len(result)} floors in response")
        
        if not result:
            logger.warning("No floors found in response")
            raise Exception("No floors found for this tenant.")
            
        return result
    
    def get_clients(self) -> List[Dict[str, Any]]:
        """
        Get clients from the Nile API.
        
        Returns:
            List of client objects
            
        Raises:
            Exception: If the request fails
        """
        endpoint = f"/api/v3/client-configs/tenant/{self.tenant_id}?action=AUTH_WAITING_FOR_APPROVAL&pageNumber=0&pageSize=99999"
        data = self.make_request(endpoint)
        
        if not isinstance(data, list):
            logger.error(f"Data is not a list: {type(data)}")
            logger.error(f"Data content: {data}")
            raise Exception(f"Could not get client data. Data is not a list: {type(data)}, data: {data}")

        logger.info(f"Found {len(data)} clients in response")
        # If no clients are found, return an empty list instead of raising an exception.
        if not data:
            logger.warning("No clients found in response, returning empty list.")
            return [] # Return empty list for 200 OK response
            # raise Exception("No clients found for this tenant.") # Previous behavior
            
        return data
