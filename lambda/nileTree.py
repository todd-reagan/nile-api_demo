import json
import os
import boto3
from boto3.dynamodb.conditions import Key

class nileTree:
    """
    Class to update the API token and prepare the connection to AWS DynamoDB.
    """

    def __init__(self, api_key=None, tenant_id=None):
        """
        Initialize the nileTree class.
        
        :param api_key: The API key to use for authentication
        :param tenant_id: The tenant ID to use for querying data
        """
        # Initialize AWS resources
        dynamodb = boto3.resource('dynamodb')
        self.table = dynamodb.Table('tenant')
        
        # Store API key and tenant ID
        self.api_key = api_key
        self.tenant_id = tenant_id

    def transform_hierarchy(self, raw_data):
        """
        Transform the raw data into a hierarchical structure.
        
        :param raw_data: A list of lists containing sites, buildings, and floors
        :return: A hierarchical structure of the tenant's data
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
 

    def get_buildings(self):
        """
        Get a list of tenant site names from DynamoDB.

        :return: A list of site names.
        """
        # Use the tenant ID from the x-tenant-id header
        if not self.tenant_id:
            raise Exception("Tenant ID is required. Please provide it in the x-tenant-id header.")
            
        partition_key_value = self.tenant_id
        
        # Initialize variables to empty lists in case any of the queries fail
        sites = []
        buildings = []
        floors = []
        segments = []
        
        # Get sites
        try:
            prefix = "S#"
            key_condition = Key('pk').eq(partition_key_value) & Key('sk').begins_with(prefix)
            response = self.table.query(KeyConditionExpression=key_condition)
            
            result = response['Items']
            if result:  # Only process if we have results
                for site in result:
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
            prefix = "B#"
            key_condition = Key('pk').eq(partition_key_value) & Key('sk').begins_with(prefix)
            response = self.table.query(KeyConditionExpression=key_condition)
            
            result = response['Items']
            if result:  # Only process if we have results
                for bldg in result:
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
            prefix = "F#"
            key_condition = Key('pk').eq(partition_key_value) & Key('sk').begins_with(prefix)
            response = self.table.query(KeyConditionExpression=key_condition)
            
            result = response['Items']
            if result:  # Only process if we have results
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
        except Exception as err:
            print(f"Error retrieving floors: {err}")
            # Continue with empty floors list rather than failing completely
        
        # Get segments
        try:
            prefix = "SEG#"
            key_condition = Key('pk').eq(partition_key_value) & Key('sk').begins_with(prefix)
            response = self.table.query(KeyConditionExpression=key_condition)
            
            result = response['Items']
            if result:  # Only process if we have results
                for seg in result:
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
            tenanttree = self.transform_hierarchy(raw_data)
            return tenanttree
        except Exception as err:
            raise Exception(f"Error transforming hierarchy: {err}") from err


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
    
    # Initialize the nileTree class with the API key and tenant ID
    tree = nileTree(api_key=api_key, tenant_id=tenant_id)

    try:
        trees = tree.get_buildings()

        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps(trees)
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
