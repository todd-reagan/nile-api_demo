import json
import os
import boto3
from boto3.dynamodb.conditions import Key

class nileFloor:
    """
    Class to update the API token and prepare the connection to AWS DynamoDB.
    """

    def __init__(self, api_key=None, tenant_id=None):
        """
        Initialize the nileFloor class.
        
        :param api_key: The API key to use for authentication
        :param tenant_id: The tenant ID to use for querying data
        """
        # Initialize AWS resources
        dynamodb = boto3.resource('dynamodb')
        self.table = dynamodb.Table('tenant')
        
        # Store API key and tenant ID
        self.api_key = api_key
        self.tenant_id = tenant_id

    def get_floors(self):
        """
        Get a list of tenant site names from DynamoDB.

        :return: A list of site names.
        """
        # Use the tenant ID from the x-tenant-id header
        if not self.tenant_id:
            raise Exception("Tenant ID is required. Please provide it in the x-tenant-id header.")
            
        partition_key_value = self.tenant_id
        prefix = "F#"

        key_condition = Key('pk').eq(partition_key_value) & Key('sk').begins_with(prefix)
    

        response = self.table.query(KeyConditionExpression=key_condition)

        try:

            result = response['Items']
            
            if not result:
                raise Exception("Could not get floor names. Likely no floors exist.")

            floors = []
            for floor in result:
                data = {
                    "tenantid": floor['pk'],
                    "siteid": floor['sk'].split('#')[1],
                    "bldgid": floor['sk'].split('#')[2],
                    "floorid": floor['sk'].split('#')[3],
                    "name": floor['name'],
                    "number": str(floor['number'])
                }
                floors.append(data)
            return floors

        except Exception as err:
            raise Exception(f"Error retrieving floor names: {err}") from err

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
        print("Handling preflight request")
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
        # Extract API key from x-api-key header
        if 'x-api-key' in event['headers']:
            api_key = event['headers']['x-api-key']
        # Fall back to Authorization header if x-api-key is not present
        elif 'Authorization' in event['headers']:
            auth_header = event['headers']['Authorization']
            if auth_header.startswith('Bearer '):
                api_key = auth_header[7:]  # Remove 'Bearer ' prefix
        
        # Extract tenant ID from x-tenant-id header
        if 'x-tenant-id' in event['headers']:
            tenant_id = event['headers']['x-tenant-id']
    
    # Check if the event contains the queryStringParameters
    if 'queryStringParameters' in event and event['queryStringParameters']:
        # Extract tenant ID from query parameters if not found in headers
        if not tenant_id and 'tenantId' in event['queryStringParameters']:
            tenant_id = event['queryStringParameters']['tenantId']
    
    # Initialize the nileFloor class with the API key and tenant ID
    nileFloors = nileFloor(api_key=api_key, tenant_id=tenant_id)

    try:
        floors = nileFloors.get_floors()

        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps(floors)
        }

    except Exception as e:
        error_details = {
            'error': str(e),
            'tenant_id': tenant_id,
            'api_key_present': api_key is not None,
            'event_headers': event.get('headers', {}),
            'event_query_params': event.get('queryStringParameters', {})
        }
        
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps(error_details)
        }
