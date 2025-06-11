"""
Lambda function to retrieve tenant hierarchy information from DynamoDB.
"""

import json
import logging
import os
from typing import Dict, Any, List, Optional, Tuple

import boto3
from boto3.dynamodb.conditions import Key

# Configure logging
logger = logging.getLogger()
debug_mode = os.environ.get("DEBUG", "false").lower() == "true"
logger.setLevel(logging.INFO if debug_mode else logging.WARNING)

# Define CORS headers
CORS_HEADERS = {
    'Content-Type': "application/json",
    'Access-Control-Allow-Origin': '*',  # Enable CORS
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-api-key,x-tenant-id',
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
}

# DynamoDB table name
TENANT_TABLE_NAME = 'tenant'


class NileBaseHandler:
    """Base class for all Nile API Lambda handlers."""

    def __init__(self, api_key: Optional[str] = None, tenant_id: Optional[str] = None):
        """
        Initialize the base handler.
        
        Args:
            api_key: The API key to use for authentication
            tenant_id: The tenant ID to use for querying data
        """
        # Initialize AWS resources
        dynamodb = boto3.resource('dynamodb')
        self.table = dynamodb.Table(TENANT_TABLE_NAME)
        
        # Store API key and tenant ID
        self.api_key = api_key
        self.tenant_id = tenant_id

    def validate_tenant_id(self) -> None:
        """
        Validate that a tenant ID is provided.
        
        Raises:
            Exception: If tenant ID is not provided
        """
        if not self.tenant_id:
            raise Exception("Tenant ID is required. Please provide it in the x-tenant-id header.")

    def query_items(self, prefix: str) -> List[Dict[str, Any]]:
        """
        Query items from DynamoDB with the given prefix.
        
        Args:
            prefix: The prefix to use for the sort key
            
        Returns:
            List of items from DynamoDB
            
        Raises:
            Exception: If the query fails
        """
        self.validate_tenant_id()
        
        key_condition = Key('pk').eq(self.tenant_id) & Key('sk').begins_with(prefix)
        
        try:
            response = self.table.query(KeyConditionExpression=key_condition)
            result = response.get('Items', [])
            
            if not result:
                logger.warning(f"No items found with prefix {prefix} for tenant {self.tenant_id}")
                
            return result
        except Exception as err:
            logger.error(f"Error querying items with prefix {prefix}: {err}")
            raise Exception(f"Error querying items: {err}") from err


class NileTreeHandler(NileBaseHandler):
    """Handler for tenant hierarchy operations."""

    def transform_hierarchy(self, raw_data: List[List[Dict[str, Any]]]) -> Dict[str, Any]:
        """
        Transform the raw data into a hierarchical structure.
        
        Args:
            raw_data: A list of lists containing sites, buildings, and floors
            
        Returns:
            A hierarchical structure of the tenant's data
            
        Raises:
            Exception: If there's an error transforming the hierarchy
        """
        try:
            tenant_structure = {}
            
            # If raw_data is empty or doesn't contain any items, return a minimal structure
            if not raw_data or all(not group for group in raw_data):
                return {"tenantid": self.tenant_id, "sites": []}
            
            for group in raw_data:
                for item in group:
                    # Skip items that don't have the required fields
                    if "tenantid" not in item:
                        continue
                        
                    tenant_id = item["tenantid"]
                    site_id = item.get("siteid")
                    bldg_id = item.get("bldgid")
                    floor_id = item.get("floorid")
                    
                    # Skip items that don't have a site ID
                    if not site_id:
                        continue

                    # Init tenant level
                    if "tenantid" not in tenant_structure:
                        tenant_structure["tenantid"] = tenant_id
                        tenant_structure["sites"] = []

                    # Find or create site
                    site = next((s for s in tenant_structure["sites"] if s["siteid"] == site_id), None)
                    if not site:
                        try:
                            address_data = {}
                            if "address" in item:
                                if isinstance(item["address"], str):
                                    address_data = json.loads(item["address"])
                                elif isinstance(item["address"], dict):
                                    address_data = item["address"]
                        except Exception as e:
                            print(f"Error parsing address: {e}")
                            address_data = {}
                            
                        site = {
                            "siteid": site_id,
                            "name": item.get("name", ""),
                            "address": address_data,
                            "buildings": []
                        }
                        tenant_structure["sites"].append(site)

                    # If building info is present
                    if bldg_id:
                        building = next((b for b in site["buildings"] if b["bldgid"] == bldg_id), None)
                        if not building:
                            try:
                                address_data = {}
                                if "address" in item:
                                    if isinstance(item["address"], str):
                                        address_data = json.loads(item["address"])
                                    elif isinstance(item["address"], dict):
                                        address_data = item["address"]
                            except Exception as e:
                                print(f"Error parsing address: {e}")
                                address_data = {}
                                
                            building = {
                                "bldgid": bldg_id,
                                "name": item.get("name", ""),
                                "address": address_data,
                                "floors": []
                            }
                            site["buildings"].append(building)

                        # If floor info is present
                        if floor_id:
                            floor = {
                                "floorid": floor_id,
                                "name": item.get("name", ""),
                                "number": item.get("number", "")
                            }
                            building["floors"].append(floor)
            
            return tenant_structure
            
        except Exception as e:
            print(f"Error in transform_hierarchy: {e}")
            # Return a minimal structure if there's an error
            return {"tenantid": self.tenant_id, "sites": [], "error": str(e)}

    def get_buildings(self) -> Dict[str, Any]:
        """
        Get a hierarchical view of tenant sites, buildings, and floors from DynamoDB.

        Returns:
            A hierarchical structure of the tenant's data
            
        Raises:
            Exception: If no data exists or if there's an error retrieving it
        """
        # Initialize variables to empty lists in case any of the queries fail
        sites = []
        buildings = []
        floors = []
        segments = []
        
        # Get sites
        try:
            sites_result = self.query_items("S#")
            
            if sites_result:  # Only process if we have results
                for site in sites_result:
                    data = {
                        "tenantid": site['pk'],
                        "siteid": site['sk'].split('#')[1],
                        "name": site['name'],
                        "address": site['address']
                    }
                    sites.append(data)
        except Exception as err:
            print(f"Error retrieving sites: {err}")
            # Continue with empty sites list rather than failing completely
        
        # Get buildings
        try:
            bldgs_result = self.query_items("B#")
            
            if bldgs_result:  # Only process if we have results
                for bldg in bldgs_result:
                    data = {
                        "tenantid": bldg['pk'],
                        "siteid": bldg['sk'].split('#')[1],
                        "bldgid": bldg['sk'].split('#')[2],
                        "name": bldg['name'],
                        "address": bldg['address']
                    }
                    buildings.append(data)
        except Exception as err:
            print(f"Error retrieving buildings: {err}")
            # Continue with empty buildings list rather than failing completely
        
        # Get floors
        try:
            floors_result = self.query_items("F#")
            
            if floors_result:  # Only process if we have results
                for floor in floors_result:
                    data = {
                        "tenantid": floor['pk'],
                        "siteid": floor['sk'].split('#')[1],
                        "bldgid": floor['sk'].split('#')[2],
                        "floorid": floor['sk'].split('#')[3],
                        "name": floor['name'],
                        "number": str(floor['number'])
                    }
                    floors.append(data)
        except Exception as err:
            print(f"Error retrieving floors: {err}")
            # Continue with empty floors list rather than failing completely
        
        # Get segments
        try:
            segments_result = self.query_items("SEG#")
            
            if segments_result:  # Only process if we have results
                for seg in segments_result:
                    data = {
                        "tenantid": seg['pk'],
                        "segment": seg['name']
                    }
                    segments.append(data)
        except Exception as err:
            print(f"Error retrieving segments: {err}")
            # Continue with empty segments list rather than failing completely
        
        # Check if we have any data at all
        if not sites and not buildings and not floors:
            raise Exception("No data found for the provided tenant ID. Please check that the tenant ID is correct.")
        
        raw_data = [sites, buildings, floors]
        
        try:
            tenant_tree = self.transform_hierarchy(raw_data)
            return tenant_tree
        except Exception as err:
            raise Exception(f"Error transforming hierarchy: {err}") from err


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
    return standard_lambda_handler(event, context, NileTreeHandler, 'get_buildings')
