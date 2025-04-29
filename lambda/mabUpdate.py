import json
import os
import boto3
import urllib3

class mabUpdate:
    """
    Class to update the API token and prepare the connection to AWS DynamoDB.
    """

    def __init__(self, api_key=None, tenant_id=None):
        """
        Initialize the mabUpdate class.

        :param api_key: The API key to use for authentication (optional)
        :param tenant_id: The tenant ID to use for querying data (optional)
        :param debug: Enable debug logging if True.
        """
        self.debug = os.environ.get("DEBUG")
        self.url = "https://u1.nile-global.cloud"  # Default URL for Nile API
        self.api_token = api_key  # Use the provided API key
        self.tenant_id = tenant_id  # Store the tenant ID
        
        # Initialize DynamoDB
        dynamodb = boto3.resource('dynamodb')
        self.client = dynamodb.Table('client')
        
    def get_clients(self, tenantId=None):
        """
        Call the Nile MAB Onboarding API to get a list of tenant building floors using urllib3.

        :param tenantId: The tenant ID to use for querying data (optional)
        :return: A list of floors names.
        :raises Exception: When the API call fails or returns no data.
        """
        # Set up logging
        import logging
        logger = logging.getLogger()
        
        logger.info("get_clients method called")
        
        # Use the provided tenant ID, or the one from the constructor
        tenant_id_to_use = tenantId or self.tenant_id
        logger.info(f"Using tenant ID: {tenant_id_to_use}")
        
        if not tenant_id_to_use:
            logger.error("No tenant ID provided")
            raise Exception("Tenant ID is required. Please provide it in the x-tenant-id header.")
            
        if not self.api_token:
            logger.error("No API token provided")
            raise Exception("API key is required. Please provide it in the Authorization header.")
        
        logger.info(f"API token present (first 10 chars): {self.api_token[:10] if self.api_token else 'None'}")
        
        headers = {'Authorization': f'Bearer {self.api_token}'}
        final_url = f"{self.url}/api/v3/client-configs/tenant/{tenant_id_to_use}?action=AUTH_WAITING_FOR_APPROVAL&pageNumber=0&pageSize=99999"
        
        logger.info(f"Request URL: {final_url}")
        logger.info(f"Request headers: {headers}")

        http = urllib3.PoolManager()
        try:
            logger.info("Sending HTTP request")
            
            # Add timeout to the request
            response = http.request(
                "GET", 
                final_url, 
                headers=headers,
                timeout=30.0,  # 30 second timeout
                retries=3      # Retry up to 3 times
            )
            
            logger.info(f"Response received. Status: {response.status}")
            logger.info(f"Response headers: {dict(response.headers)}")
            
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
            data = json.loads(response_data)
            logger.info(f"Data type: {type(data)}")
            
            if not isinstance(data, list):
                logger.error(f"Data is not a list: {type(data)}")
                logger.error(f"Data content: {data}")
                raise Exception(f"Could not get client Names. Data is not a list: {type(data)}, data: {data}")

            logger.info(f"Processing {len(data)} items")
            clients = []
            for i, item in enumerate(data):
                logger.info(f"Processing item {i+1}/{len(data)}")
                client = item.get("clientConfig", {})
                if not client:
                    logger.warning(f"No clientConfig found in item {i+1}")
                    logger.warning(f"Item content: {item}")
                    continue
                    
                data = {
                    "id": client.get("id", "Unknown"),
                    "macAddress": client.get("macAddress", "Unknown"),
                    "tenantid": client.get("tenantId", "Unknown"),
                    "siteid": client.get("siteId", "Unknown"),
                    "buildingid": client.get("buildingId", "Unknown"),
                    "floorid": client.get("floorId", "Unknown"),
                    "zoneid":  client.get("zoneId", "Unknown"),
                    "segmentid": client.get("segmentId", "Unknown"),
                    "deviceid": client.get("deviceId", "Unknown"),
                    "port": client.get("port", "Unknown"),
                    "state":  client.get("state", "Unknown"),
                    "geoScope":  client.get("geoScope", "Unknown"),
                    "authenticatedBy": client.get("authenticatedBy", "Unknown"),
                    "staticip":  client.get("staticIp", "Unknown"),
                    "ipaddress":  client.get("ipAddress", "Unknown"),
                }
                clients.append(data)
            
            logger.info(f"Successfully processed {len(clients)} clients")
            return clients

        except json.JSONDecodeError as err:
            logger.error(f"JSON decode error: {err}", exc_info=True)
            logger.error(f"Raw response data: {response_data[:1000]}")
            raise Exception(f"Error decoding JSON response: {err}. Raw data: {response_data[:500]}") from err
        except urllib3.exceptions.HTTPError as err:
            logger.error(f"HTTP error: {err}", exc_info=True)
            raise Exception(f"HTTP error: {err}") from err
        except Exception as err:
            logger.error(f"Unexpected error in get_clients: {err}", exc_info=True)
            raise Exception(f"Error retrieving client names: {err}") from err


def lambda_handler(event, context):
    """
    AWS Lambda handler function.
    
    :param event: The event containing the API key and tenant ID
    :param context: The Lambda context
    :return: The API response
    """
    # Set up logging
    import logging
    import os
    logger = logging.getLogger()
    
    # Set log level based on DEBUG environment variable
    debug_mode = os.environ.get("DEBUG", "false").lower() == "true"
    if debug_mode:
        logger.setLevel(logging.INFO)
    else:
        logger.setLevel(logging.WARNING)
    
    # Log the entire event for debugging
    logger.info(f"Received event: {json.dumps(event, default=str)}")
    logger.info(f"Context: {context}")
    
    # Define CORS headers
    cors_headers = {
        'Content-Type': "application/json",
        'Access-Control-Allow-Origin': '*',  # Enable CORS
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,x-api-key,x-tenant-id',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
    }
    
    # Check if this is a preflight request (OPTIONS)
    if event.get('requestContext', {}).get('http', {}).get('method') == 'OPTIONS' or \
       event.get('httpMethod') == 'OPTIONS':
        logger.info("Handling preflight request")
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({'message': 'CORS preflight request successful'})
        }
    
    # Extract API key and tenant ID from the event
    api_key = None
    tenant_id = None
    
    # Check if the event contains the headers
    if 'headers' in event:
        logger.info(f"Headers found in event: {event['headers']}")
        
        # Extract API key from x-api-key header
        if 'x-api-key' in event['headers']:
            api_key = event['headers']['x-api-key']
            logger.info(f"API key extracted from x-api-key header: {api_key[:10]}...")
        # Fall back to Authorization header if x-api-key is not present
        elif 'Authorization' in event['headers']:
            auth_header = event['headers']['Authorization']
            logger.info(f"Authorization header found: {auth_header[:10]}...")
            if auth_header.startswith('Bearer '):
                api_key = auth_header[7:]  # Remove 'Bearer ' prefix
                logger.info(f"API key extracted from Authorization header: {api_key[:10]}...")
            else:
                logger.warning("Authorization header does not start with 'Bearer '")
        else:
            logger.warning("No API key headers found in event (checked x-api-key, X-Api-Key, and Authorization)")
        
        # Extract tenant ID from x-tenant-id header
        if 'x-tenant-id' in event['headers']:
            tenant_id = event['headers']['x-tenant-id']
            logger.info(f"Tenant ID extracted from x-tenant-id header: {tenant_id}")
        else:
            logger.warning("No x-tenant-id header found in event")
    else:
        logger.warning("No headers found in event")
    
    # Check if the event contains the queryStringParameters
    if 'queryStringParameters' in event and event['queryStringParameters']:
        logger.info(f"Query parameters found in event: {event['queryStringParameters']}")
        
        # Extract tenant ID from query parameters if not found in headers
        if not tenant_id and 'tenantId' in event['queryStringParameters']:
            tenant_id = event['queryStringParameters']['tenantId']
            logger.info(f"Tenant ID extracted from query parameters: {tenant_id}")
    
    logger.info(f"Final API key status: {'Present' if api_key else 'Missing'}")
    logger.info(f"Final tenant ID: {tenant_id}")
    
    # Initialize the mabUpdate class with the API key and tenant ID
    logger.info("Initializing mabUpdate class")
    mab_update = mabUpdate(api_key=api_key, tenant_id=tenant_id)

    try:
        # Use the tenant ID from the event or constructor
        logger.info("Calling get_clients method")
        clients = mab_update.get_clients()
        logger.info(f"Successfully retrieved {len(clients)} clients")

        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps(clients)
        }

    except Exception as e:
        logger.error(f"Error in lambda_handler: {str(e)}", exc_info=True)
        
        error_details = {
            'error': str(e),
            'error_type': type(e).__name__,
            'tenant_id': tenant_id,
            'api_key_present': api_key is not None,
            'event_headers': event.get('headers', {}),
            'event_query_params': event.get('queryStringParameters', {})
        }
        
        logger.error(f"Returning error response: {json.dumps(error_details)}")
        
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps(error_details)
        }
