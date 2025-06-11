"""
Lambda function to update tenant data from the Nile API.
"""

import json
import time
import boto3
import logging
import os
from typing import Dict, Any, List, Tuple, Optional

from api_utils import NileApiClient

# Configure logging
logger = logging.getLogger()
debug_mode = os.environ.get("DEBUG", "false").lower() == "true"
logger.setLevel(logging.INFO if debug_mode else logging.WARNING)

# Define CORS headers
CORS_HEADERS = {
    'Content-Type': "application/json",
    'Access-Control-Allow-Origin': '*',  # Enable CORS
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,x-api-key,x-tenant-id,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
}

class TenantUpdateHandler:
    """Handler for updating tenant data from the Nile API."""

    def __init__(self, api_key: str = None, tenant_id: str = None):
        """
        Initialize the TenantUpdateHandler.
        
        Args:
            api_key: The API key to use for authentication
            tenant_id: The tenant ID to use for querying data
        """
        # Initialize the Nile API client
        self.api_client = NileApiClient(api_key=api_key, tenant_id=tenant_id)
        
        # Initialize DynamoDB
        dynamodb = boto3.resource('dynamodb')
        self.table = dynamodb.Table('tenant')
    
    def update_segments(self) -> List[Dict[str, Any]]:
        """
        Update segment data in DynamoDB from the Nile API.
        
        Returns:
            List of updated segment objects
            
        Raises:
            Exception: If the update fails
        """
        # Get segments from the Nile API
        max_retries = 5
        for attempt in range(max_retries):
            try:
                segments_data = self.api_client.get_segments()
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                else:
                    raise e
        
        # Process and store segments in DynamoDB
        segments = []
        for seg in segments_data:
            # Check if required keys exist
            required_keys = ["tenantId", "id", "instanceName", "version"]
            missing_keys = [key for key in required_keys if key not in seg]
            if missing_keys:
                continue
            
            # Extract segment details
            segment_info = seg.get("segment", {})
            geo_scope = seg.get("geoScope", {})
            linked_settings = seg.get("linkedSettings", {})
            
            # Create base data object
            data = {
                "pk": seg["tenantId"],
                "sk": "SEG#" + seg["id"],
                "name": seg["instanceName"],
                "encrypted": seg.get("encrypted", True),
                "version": seg["version"],
                "id": seg["id"],
                "useTags": seg.get("useTags", False),
                "settingStatus": seg.get("settingStatus", "UNKNOWN"),
                "tagIds": seg.get("tagIds", [])
            }
            
            # Add segment details if available
            if segment_info:
                data["segmentDetails"] = {
                    "name": segment_info.get("name", ""),
                    "urls": segment_info.get("urls", []),
                    "popTunnelEnabled": segment_info.get("popTunnelEnabled", False),
                    "wiredSelfRegisterEnabled": segment_info.get("wiredSelfRegisterEnabled", False),
                    "wiredSsoEnabled": segment_info.get("wiredSsoEnabled", False),
                    "wiredGuestEnabled": segment_info.get("wiredGuestEnabled", False)
                }
            
            # Add geo scope if available
            if geo_scope:
                data["geoScope"] = {
                    "siteIds": geo_scope.get("siteIds", []),
                    "buildingIds": geo_scope.get("buildingIds", []),
                    "zoneIds": geo_scope.get("zoneIds", []),
                    "globalInfo": geo_scope.get("globalInfo", [])
                }
            
            # Add linked settings if available
            if linked_settings:
                # Process different types of settings
                site_settings = []
                for setting in linked_settings.get("siteSettings", []):
                    site_setting = {
                        "type": setting.get("type", ""),
                        "id": setting.get("id", ""),
                        "location": setting.get("location", "")
                    }
                    
                    # Handle extra field which can be null, array, or object
                    if "extra" in setting:
                        site_setting["extra"] = setting["extra"]
                    
                    site_settings.append(site_setting)
                
                data["linkedSettings"] = {
                    "globalSettings": linked_settings.get("globalSettings", []),
                    "siteSettings": site_settings,
                    "buildingSettings": linked_settings.get("buildingSettings", []),
                    "zoneSettings": linked_settings.get("zoneSettings", [])
                }
            
            # Store in DynamoDB
            self.table.put_item(Item=data)
            segments.append(data)
        
        return segments
    
    def update_sites(self) -> List[Dict[str, Any]]:
        """
        Update site data in DynamoDB from the Nile API.
        
        Returns:
            List of updated site objects
            
        Raises:
            Exception: If the update fails
        """
        # Get sites from the Nile API
        max_retries = 5
        for attempt in range(max_retries):
            try:
                sites_data = self.api_client.get_sites()
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                else:
                    raise e
        
        # Process and store sites in DynamoDB
        sites = []
        for site in sites_data:
            # Check if required keys exist
            required_keys = ["tenantId", "id", "name", "address"]
            missing_keys = [key for key in required_keys if key not in site]
            if missing_keys:
                continue
            
            data = {
                "pk": site['tenantId'],
                "sk": "S#" + site['id'],
                "name": site['name'],
                "description": site.get("description", "Unknown"),
                "address": site['address']
            }
            
            # Store in DynamoDB
            self.table.put_item(Item=data)
            sites.append(data)
        
        return sites
    
    def update_buildings(self) -> List[Dict[str, Any]]:
        """
        Update building data in DynamoDB from the Nile API.
        
        Returns:
            List of updated building objects
            
        Raises:
            Exception: If the update fails
        """
        # Get buildings from the Nile API
        max_retries = 5
        for attempt in range(max_retries):
            try:
                buildings_data = self.api_client.get_buildings()
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                else:
                    raise e
        
        # Process and store buildings in DynamoDB
        buildings = []
        for bldg in buildings_data:
            # Check if required keys exist
            required_keys = ["tenantId", "siteId", "id", "name", "address"]
            missing_keys = [key for key in required_keys if key not in bldg]
            if missing_keys:
                continue
            
            data = {
                "pk": bldg["tenantId"],
                "sk": "B#" + bldg["siteId"] + "#" + bldg['id'],
                "name": bldg["name"],
                "description": bldg.get("description", "Unknown"),
                "address": bldg["address"]
            }
            
            # Store in DynamoDB
            self.table.put_item(Item=data)
            buildings.append(data)
        
        return buildings
    
    def update_floors(self) -> List[Dict[str, Any]]:
        """
        Update floor data in DynamoDB from the Nile API.
        
        Returns:
            List of updated floor objects
            
        Raises:
            Exception: If the update fails
        """
        # Get floors from the Nile API
        max_retries = 5
        for attempt in range(max_retries):
            try:
                floors_data = self.api_client.get_floors()
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                else:
                    raise e
        
        # Process and store floors in DynamoDB
        floors = []
        for floor in floors_data:
            # Check if required keys exist
            required_keys = ["tenantId", "siteId", "buildingId", "id", "name", "number"]
            missing_keys = [key for key in required_keys if key not in floor]
            if missing_keys:
                continue
            
            data = {
                "pk": floor["tenantId"],
                "sk": "F#" + floor["siteId"] + "#" + floor["buildingId"] + "#" + floor["id"],
                "name": floor["name"],
                "description": floor.get("description", "Unknown"),
                "number": floor["number"]
            }
            
            # Store in DynamoDB
            self.table.put_item(Item=data)
            floors.append(data)
        
        return floors
    
    def update_tenant_data(self) -> Dict[str, Any]:
        """
        Update all tenant data in DynamoDB from the Nile API.
        
        Returns:
            Dictionary with counts of updated objects
            
        Raises:
            Exception: If the update fails
        """
        # Update all data types
        segments = self.update_segments()
        sites = self.update_sites()
        buildings = self.update_buildings()
        floors = self.update_floors()
        
        # Return counts of updated objects
        return {
            "message": "Site(s), Building(s), Floor(s), and Segment(s) updated successfully.",
            "counts": {
                "segments": len(segments),
                "sites": len(sites),
                "buildings": len(buildings),
                "floors": len(floors)
            }
        }


def extract_credentials_from_event(event: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
    """
    Extract API key and tenant ID from the Lambda event.
    
    Args:
        event: The Lambda event
        
    Returns:
        Tuple of (api_key, tenant_id)
    """
    api_key = None
    tenant_id = None
    
    # Check if the event contains the headers
    if 'headers' in event:
        headers = event['headers']
        # Extract API key from x-api-key header
        if 'x-api-key' in headers:
            api_key = headers['x-api-key']
        # Fall back to Authorization header if x-api-key is not present
        elif 'Authorization' in headers:
            auth_header = headers['Authorization']
            if auth_header.startswith('Bearer '):
                api_key = auth_header[7:]  # Remove 'Bearer ' prefix
        
        # Extract tenant ID from x-tenant-id header
        if 'x-tenant-id' in headers:
            tenant_id = headers['x-tenant-id']
    
    # Check if the event contains the queryStringParameters
    if 'queryStringParameters' in event and event['queryStringParameters']:
        # Extract tenant ID from query parameters if not found in headers
        if not tenant_id and 'tenantId' in event['queryStringParameters']:
            tenant_id = event['queryStringParameters']['tenantId']
    
    return api_key, tenant_id


def handle_preflight_request() -> Dict[str, Any]:
    """
    Handle CORS preflight requests.
    
    Returns:
        API Gateway response
    """
    return {
        'statusCode': 200,
        'headers': CORS_HEADERS,
        'body': json.dumps({'message': 'CORS preflight request successful'})
    }


def create_response(status_code: int, body: Any) -> Dict[str, Any]:
    """
    Create an API Gateway response.
    
    Args:
        status_code: HTTP status code
        body: Response body
        
    Returns:
        API Gateway response
    """
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(body, default=str)
    }


def create_error_response(error: Exception, tenant_id: Optional[str], api_key_present: bool, 
                         event_headers: Dict[str, str], event_query_params: Dict[str, str]) -> Dict[str, Any]:
    """
    Create an error response for API Gateway.
    
    Args:
        error: The exception that occurred
        tenant_id: The tenant ID
        api_key_present: Whether an API key was provided
        event_headers: The event headers
        event_query_params: The event query parameters
        
    Returns:
        API Gateway error response
    """
    error_details = {
        'error': str(error),
        'tenant_id': tenant_id,
        'api_key_present': api_key_present,
        'event_headers': event_headers,
        'event_query_params': event_query_params
    }
    
    return create_response(500, error_details)


def standard_lambda_handler(event: Dict[str, Any], context: Any, handler_class: Any, 
                           handler_method_name: str) -> Dict[str, Any]:
    """
    Standard Lambda handler function that can be used by all Nile API Lambda functions.
    
    Args:
        event: The Lambda event
        context: The Lambda context
        handler_class: The class to instantiate for handling the request
        handler_method_name: The method name to call on the handler instance
        
    Returns:
        API Gateway response
    """
    # Log the entire event for debugging
    logger.info(f"Received event: {json.dumps(event, default=str)}")
    logger.info(f"Context: {context}")
    
    # Check if this is a preflight request (OPTIONS)
    if event.get('requestContext', {}).get('http', {}).get('method') == 'OPTIONS' or \
       event.get('httpMethod') == 'OPTIONS':
        logger.info("Handling preflight request")
        return handle_preflight_request()
    
    # Extract API key and tenant ID from the event
    api_key, tenant_id = extract_credentials_from_event(event)
    
    # Initialize the handler class with the API key and tenant ID
    handler = handler_class(api_key=api_key, tenant_id=tenant_id)

    try:
        # Call the handler method
        result = getattr(handler, handler_method_name)()
        return create_response(200, result)
    except Exception as e:
        logger.error(f"Error in {handler_class.__name__}.{handler_method_name}: {e}")
        return create_error_response(
            error=e,
            tenant_id=tenant_id,
            api_key_present=api_key is not None,
            event_headers=event.get('headers', {}),
            event_query_params=event.get('queryStringParameters', {})
        )


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda handler function.
    
    Args:
        event: The Lambda event
        context: The Lambda context
        
    Returns:
        API Gateway response
    """
    return standard_lambda_handler(event, context, TenantUpdateHandler, 'update_tenant_data')
