"""
Lambda function to retrieve client data from the Nile API and update MAB client states.
"""

import boto3
import os
import json
import logging
import urllib3
from typing import Dict, Any, List, Tuple, Optional

from api_utils import NileApiClient

# Configure logging - Ensure it's configured if not already by utils or api_utils
# If standard_lambda_handler or other utils configure it, this might be redundant
# For standalone parts like update_mac_auth_state, ensure logger is available.
logger = logging.getLogger(__name__) # Use a named logger for this module
if not logger.handlers: # Avoid adding multiple handlers if already configured
    logger.setLevel(logging.INFO)
    # Add a basic handler if no handlers are configured (e.g. when testing locally)
    # In AWS Lambda, the runtime usually configures a handler.
    # handler = logging.StreamHandler()
    # formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    # handler.setFormatter(formatter)
    # logger.addHandler(handler)


# Constants for the PATCH operation
NILE_API_ENDPOINT_CLIENT_CONFIGS = "https://u1.nile-global.cloud/api/v1/client-configs"
DEFAULT_DESCRIPTION_MAC_AUTH = "Updated via MAB Onboarding API"
ALLOWED_MAC_AUTH_STATES = {"AUTH_OK", "AUTH_DENIED"}

# Initialize PoolManager for PATCH requests
http_patch_client = urllib3.PoolManager()

# Common CORS headers for all responses from this Lambda
# API Gateway should be configured to handle OPTIONS and might override/add some of these.
# Specifically, Access-Control-Allow-Origin should ideally be set by API Gateway based on request origin.
BASE_RESPONSE_HEADERS = {
    'Content-Type': 'application/json', # Default Content-Type, actual response might refine
    'Access-Control-Allow-Origin': '*', # Replace with specific origin in API Gateway for production
    'Access-Control-Allow-Methods': 'GET,PATCH,OPTIONS', # Methods this Lambda supports via API Gateway
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-api-key,x-tenant-id,Authorization',
    'Access-Control-Allow-Credentials': 'true' # If you use credentials/cookies
}

class MabUpdateHandler:
    """Handler for retrieving and updating client data from the Nile API."""

    def __init__(self, api_key: str = None, tenant_id: str = None):
        """
        Initialize the MabUpdateHandler.
        
        Args:
            api_key: The API key to use for authentication
            tenant_id: The tenant ID to use for querying data
        """
        # Initialize the Nile API client
        self.api_client = NileApiClient(api_key=api_key, tenant_id=tenant_id)
        
        # Initialize DynamoDB
        dynamodb = boto3.resource('dynamodb')
        self.table = dynamodb.Table('client')
    
    def get_clients(self) -> List[Dict[str, Any]]:
        """
        Get client data from the Nile API and store in DynamoDB.
        
        Returns:
            List of client objects
            
        Raises:
            Exception: If the request fails
        """
        # Get clients from the Nile API
        clients_data = self.api_client.get_clients()
        
        # Process client data
        clients = []
        for item in clients_data:
            client = item.get("clientConfig", {})
            if not client:
                continue
                
            data = {
                "id": client.get("id", "Unknown"),
                "macAddress": client.get("macAddress", "Unknown"),
                "tenantid": client.get("tenantId", "Unknown"),
                "siteid": client.get("siteId", "Unknown"),
                "buildingid": client.get("buildingId", "Unknown"),
                "floorid": client.get("floorId", "Unknown"),
                "zoneid": client.get("zoneId", "Unknown"),
                "segmentid": client.get("segmentId", "Unknown"),
                "deviceid": client.get("deviceId", "Unknown"),
                "port": client.get("port", "Unknown"),
                "state": client.get("state", "Unknown"),
                "geoScope": client.get("geoScope", "Unknown"),
                "authenticatedBy": client.get("authenticatedBy", "Unknown"),
                "staticip": client.get("staticIp", "Unknown"),
                "ipaddress": client.get("ipAddress", "Unknown"),
            }
            
            # Store in DynamoDB (uncomment if you want to store in DynamoDB)
            # self.table.put_item(Item=data)
            
            clients.append(data)
            
        return clients

# Helper function for PATCH operation to update MAC auth state
def update_mac_auth_state(client_id: str, mac_address: str, segment_id: str, state: str, description: str, event_headers: Dict[str, str]) -> Dict[str, Any]:
    logger.info(f"Initiating MAC auth update for clientId: {client_id}, macAddress: {mac_address}, state: {state}, description: '{description}'")
    logger.info(f"Received event headers for PATCH: {json.dumps(event_headers)}")

    # Extract the API key from the incoming event's headers
    # Note: API Gateway v2.0 payload lowercases all header names.
    # The frontend sends 'x-api-key', so we look for 'x-api-key'.
    # The Nile API expects 'x-nile-api-key'. We will use the value from 'x-api-key' for 'x-nile-api-key'.
    
    # Normalize header keys to lowercase for consistent lookup
    normalized_event_headers = {k.lower(): v for k, v in event_headers.items()}
    
    nile_api_key_from_header = normalized_event_headers.get('x-api-key')

    if not nile_api_key_from_header:
        logger.error("Update MAC Auth: 'x-api-key' not found in request headers.")
        return {
            'statusCode': 400, # Bad Request, as the required header is missing
            'headers': BASE_RESPONSE_HEADERS,
            'body': json.dumps({'error': "Missing 'x-api-key' in request headers."})
        }

    # Optionally, extract x-tenant-id if the Nile PATCH endpoint requires it
    # tenant_id_from_header = normalized_event_headers.get('x-tenant-id')
    # if not tenant_id_from_header:
    #     logger.warning("Update MAC Auth: 'x-tenant-id' not found in request headers. Proceeding without it if not strictly required by Nile API.")
        # Depending on Nile API requirements, you might return an error here if tenant_id is mandatory

    if not all([client_id, mac_address, segment_id, state]):
        logger.error("Update MAC Auth: Missing one or more required parameters.")
        return {
            'statusCode': 400,
            'headers': BASE_RESPONSE_HEADERS,
            'body': json.dumps({'error': 'Missing required parameters: clientId, macAddress, segmentId, state'})
        }

    if state not in ALLOWED_MAC_AUTH_STATES:
        logger.error(f"Update MAC Auth: Invalid state value: {state}. Must be one of {ALLOWED_MAC_AUTH_STATES}")
        return {
            'statusCode': 400,
            'headers': BASE_RESPONSE_HEADERS,
            'body': json.dumps({'error': f"Invalid state value: {state}. Must be one of {ALLOWED_MAC_AUTH_STATES}"})
        }

    # Determine the description to use: provided one or default
    final_description = description if description else DEFAULT_DESCRIPTION_MAC_AUTH
    logger.info(f"Using description: '{final_description}'")

    # api_key = os.environ.get('NILE_API_KEY') # This is the x-nile-api-key - REMOVED, using header value
    # if not api_key:
    #     logger.error("Update MAC Auth: NILE_API_KEY environment variable not set for PATCH operation.")
    #     return {
    #         'statusCode': 500,
    #         'headers': BASE_RESPONSE_HEADERS,
    #         'body': json.dumps({'error': 'API key for PATCH operation not configured'})
    #     }

    composite_id = f"{client_id}-{mac_address}"
    payload = {
        "macsList": [
            {
                "id": composite_id,
                "macAddress": mac_address,
                "segmentId": segment_id,
                "state": state,
                "description": final_description # Use the determined description
            }
        ]
    }
    payload_json_str = json.dumps(payload)
    logger.info(f"Update MAC Auth: Constructed payload: {payload_json_str}")

    # Headers for the outbound request to Nile API
    nile_request_headers = {
        'x-nile-api-key': nile_api_key_from_header, # Use the key from the incoming request's x-api-key
        'Content-Type': 'application/json'
        # Add 'x-tenant-id': tenant_id_from_header if Nile API requires it for this PATCH
    }
    logger.info(f"Update MAC Auth: Request headers for Nile API: {nile_request_headers}")
    encoded_payload = payload_json_str.encode('utf-8')

    try:
        logger.info(f"Attempting PATCH request to Nile API: {NILE_API_ENDPOINT_CLIENT_CONFIGS}")
        response = http_patch_client.request(
            "PATCH",
            NILE_API_ENDPOINT_CLIENT_CONFIGS,
            headers=nile_request_headers, # Use the constructed headers for Nile
            body=encoded_payload,
            timeout=30.0,
            retries=urllib3.Retry(total=3, backoff_factor=0.5)
        )
        response_data_str = response.data.decode('utf-8')
        logger.info(f"Update MAC Auth: Response status: {response.status}, data preview: {response_data_str[:200]}")

        # Use a copy of BASE_RESPONSE_HEADERS for this specific response
        response_to_client_headers = BASE_RESPONSE_HEADERS.copy()
        response_to_client_body = {}

        if 200 <= response.status < 300: # Successful call to Nile API
            try:
                if response_data_str:
                    response_to_client_body = json.loads(response_data_str) # Nile returned JSON
                else:
                    # Nile returned 2xx but no content (e.g., 204)
                    response_to_client_body = {"message": "Operation successful, no content returned from upstream."}
                logger.info("Update MAC Auth: Successfully processed upstream success response.")
            except json.JSONDecodeError:
                # Nile returned 2xx but not JSON. Wrap it.
                logger.warning(f"Update MAC Auth: Upstream API returned status {response.status} but non-JSON response: {response_data_str[:200]}...")
                response_to_client_body = {
                    "message": "Operation successful, but upstream response was not valid JSON.",
                    "upstream_response_preview": response_data_str[:500] # Include a preview
                }
            
            return {
                'statusCode': 200, # Normalize to 200 OK for the client on any upstream success
                'headers': response_to_client_headers,
                'body': json.dumps(response_to_client_body)
            }
        else: # Error from Nile API
            logger.error(f"Update MAC Auth: Upstream API request failed with status code {response.status}. Response: {response_data_str[:500]}")
            try:
                if response_data_str:
                    # Attempt to parse error response from Nile if it's JSON
                    error_details_from_upstream = json.loads(response_data_str)
                    response_to_client_body = {'error': 'Upstream API error', 'upstream_details': error_details_from_upstream}
                else:
                    response_to_client_body = {'error': 'Upstream API error with no content.', 'upstream_status': response.status}
            except json.JSONDecodeError:
                 # Nile error response was not JSON
                 response_to_client_body = {'error': 'Upstream API error with non-JSON response.', 'upstream_status': response.status, 'upstream_response_preview': response_data_str[:500]}
            
            return {
                'statusCode': response.status, # Propagate Nile's error status
                'headers': response_to_client_headers,
                'body': json.dumps(response_to_client_body)
            }

    except urllib3.exceptions.MaxRetryError as e:
        logger.exception("Update MAC Auth: Max retries exceeded for API request.")
        return {'statusCode': 504, 'headers': BASE_RESPONSE_HEADERS, 'body': json.dumps({'error': 'API request timed out', 'details': str(e)})}
    except urllib3.exceptions.NewConnectionError as e:
        logger.exception("Update MAC Auth: Could not connect to API endpoint.")
        return {'statusCode': 503, 'headers': BASE_RESPONSE_HEADERS, 'body': json.dumps({'error': 'Could not connect to API service', 'details': str(e)})}
    except Exception as e:
        logger.exception("Update MAC Auth: An unexpected error occurred.")
        return {'statusCode': 500, 'headers': BASE_RESPONSE_HEADERS, 'body': json.dumps({'error': 'An internal server error occurred', 'details': str(e)})}


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
        'headers': BASE_RESPONSE_HEADERS,
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
        'headers': BASE_RESPONSE_HEADERS,
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
    Dispatches to GET client data or PATCH MAB client state based on httpMethod.
    """
    logger.info(f"Received event: {json.dumps(event)}") # Log the full event for debugging
    
    # Extract HTTP method correctly for API Gateway HTTP API payload format v2.0
    try:
        http_method = event['requestContext']['http']['method'].upper()
    except KeyError:
        logger.error("Could not determine HTTP method from event. Defaulting to GET. Event structure might be unexpected.")
        # Fallback or handle error - For now, default to GET for potential backward compatibility or simple tests
        http_method = 'GET'

    logger.info(f"Determined HTTP method: {http_method}")

    # Handle OPTIONS preflight request explicitly
    if http_method == 'OPTIONS':
        logger.info("OPTIONS method detected. Returning CORS headers.")
        return {
            'statusCode': 200, # Or 204 No Content
            'headers': BASE_RESPONSE_HEADERS,
            'body': json.dumps({'message': 'CORS preflight check successful'}) # Optional body
        }
    elif http_method == 'PATCH':
        logger.info("PATCH method detected. Routing to MAC auth update.")
        try:
            body_str = event.get('body', '{}')
            if isinstance(body_str, str):
                body = json.loads(body_str)
            else: # If already a dict (e.g. from direct Lambda test invoke)
                body = body_str if isinstance(body_str, dict) else {}
            
            client_id = body.get('clientId')
            mac_address = body.get('macAddress')
            segment_id = body.get('segmentId')
            state = body.get('state')
            description = body.get('description', '') # Extract description, default to empty string if missing

            # Basic validation, detailed validation is in _update_mac_auth_state
            if not all([client_id, mac_address, segment_id, state]):
                 logger.error("Main handler PATCH: Missing one or more required parameters in body.")
                 return {
                        'statusCode': 400,
                        'headers': BASE_RESPONSE_HEADERS,
                        'body': json.dumps({'error': 'Missing required parameters in request body: clientId, macAddress, segmentId, state'})
                    }
            
            # Pass the event headers and description to the update function
            event_headers = event.get('headers', {})
            return update_mac_auth_state(client_id, mac_address, segment_id, state, description, event_headers)
        except json.JSONDecodeError as e:
            logger.error(f"Main handler PATCH: Invalid JSON in request body: {str(e)}")
            return {'statusCode': 400, 'headers': BASE_RESPONSE_HEADERS, 'body': json.dumps({'error': 'Invalid JSON in request body', 'details': str(e)})}
        except Exception as e:
            logger.exception("Main handler PATCH: Unexpected error during PATCH processing.")
            return {'statusCode': 500, 'headers': BASE_RESPONSE_HEADERS, 'body': json.dumps({'error': 'Internal server error during PATCH processing', 'details': str(e)})}

    elif http_method == 'GET':
        logger.info("GET method detected. Routing to standard_lambda_handler for get_clients.")
        response = standard_lambda_handler(event, context, MabUpdateHandler, 'get_clients')
        
        # Ensure CORS headers are present in the response from standard_lambda_handler
        # Merge BASE_RESPONSE_HEADERS with any headers already in the response.
        # Headers from BASE_RESPONSE_HEADERS will be added or will overwrite existing ones if keys conflict.
        # This ensures our standard CORS headers are applied.
        current_headers = response.get('headers', {})
        final_headers = current_headers.copy()
        final_headers.update(BASE_RESPONSE_HEADERS) # Add/overwrite with our standard CORS headers
        response['headers'] = final_headers
        
        # Ensure Content-Type is application/json if not already set, as body is json.dumps'd by standard_lambda_handler
        if 'Content-Type' not in response['headers']:
            response['headers']['Content-Type'] = 'application/json'

        return response
    
    else: # This is the correct 'else' for unsupported methods
        logger.warning(f"Unsupported HTTP method: {http_method}")
        return {
            'statusCode': 405, # Method Not Allowed
            'headers': BASE_RESPONSE_HEADERS,
            'body': json.dumps({'error': f"Unsupported HTTP method: {http_method}. Supported methods: GET, PATCH."})
        }
