"""
Lambda function to retrieve network segment information from DynamoDB.
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
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,x-api-key,x-tenant-id,Authorization',
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


class NileSegmentHandler(NileBaseHandler):
    """Handler for network segment-related operations."""

    def get_segments(self) -> List[Dict[str, Any]]:
        """
        Get a list of tenant network segments from DynamoDB with enhanced details.

        Returns:
            List of segment objects with their details.
            
        Raises:
            Exception: If no segments exist or if there's an error retrieving them.
        """
        # Query items with the segment prefix
        result = self.query_items("SEG#")
        
        if not result:
            raise Exception("No network segments found for this tenant.")

        # Transform the raw DynamoDB items into a more usable format
        segments = []
        for seg in result:
            # Create base data object
            data = {
                "tenantid": seg['pk'],
                "segment": seg['name'],
                "id": seg.get('id', ''),
                "name": seg.get('name', ''),
                "encrypted": seg.get('encrypted', False),
                "version": seg.get('version', ''),
                "useTags": seg.get('useTags', False),
                "settingStatus": seg.get('settingStatus', ''),
                "tagIds": seg.get('tagIds', [])
            }
            
            # Add segment details if available
            if 'segmentDetails' in seg:
                data['segmentDetails'] = seg['segmentDetails']
            
            # Add geo scope if available
            if 'geoScope' in seg:
                data['geoScope'] = seg['geoScope']
            
            # Add linked settings if available
            if 'linkedSettings' in seg:
                data['linkedSettings'] = seg['linkedSettings']
            
            segments.append(data)
            
        return segments


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
    return standard_lambda_handler(event, context, NileSegmentHandler, 'get_segments')
