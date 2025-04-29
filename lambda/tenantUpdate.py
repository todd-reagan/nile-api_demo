import json
import os
import boto3
import urllib3

class tenantUpdate:
    """
    Class to update the API token and prepare the connection to AWS DynamoDB.
    """

    def __init__(self, api_key=None, tenant_id=None):
        """
        Initialize the tenantUpdate class.

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
        self.table = dynamodb.Table('tenant')

    def get_segment_names(self):
        """
        Call the Nile API to get a list of segment names using urllib3.

        :return: A list of segment names.
        :raises Exception: When the API call fails or returns no data.
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
        
        logger.info("get_segment_names method called")
        
        if not self.api_token:
            logger.error("No API token provided")
            raise Exception("API key is required. Please provide it in the x-api-key header.")
            
        if not self.tenant_id:
            logger.error("No tenant ID provided")
            raise Exception("Tenant ID is required. Please provide it in the x-tenant-id header.")
            
        # Include tenant ID and API key in the headers
        # Note: The API expects the API key in the Authorization header with the Bearer prefix
        headers = {
            'Authorization': f'Bearer {self.api_token}',
            'x-tenant-id': self.tenant_id
        }
        
        final_url = f"{self.url}/api/v1/settings/segments"
        
        logger.info(f"Request URL: {final_url}")
        logger.info(f"Request headers: {headers}")
            
        http = urllib3.PoolManager()
        try:
            logger.info("Sending HTTP request")
            
            # Add retry logic for 401 responses
            max_retries = 5
            retry_count = 0
            response = None
            
            while retry_count <= max_retries:
                if retry_count > 0:
                    # Calculate random backoff time between 1 and 5 seconds
                    import random
                    import time
                    backoff = random.uniform(1, 5)
                    logger.info(f"Retry {retry_count}/{max_retries} after {backoff:.2f} seconds backoff")
                    time.sleep(backoff)
                
                # Add timeout to the request
                response = http.request(
                    "GET", 
                    final_url, 
                    headers=headers,
                    timeout=30.0,  # 30 second timeout
                    retries=3      # Retry up to 3 times for network issues
                )
                
                logger.info(f"Response received. Status: {response.status}")
                logger.info(f"Response headers: {dict(response.headers)}")
                
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
            data = json.loads(response_data)
            logger.info(f"Data type: {type(data)}")
            
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
                raise Exception("Could not get Segment Name. Likely no segments exist.")

            segments = []
            for i, seg in enumerate(result):
                logger.info(f"Processing segment {i+1}/{len(result)}")
                
                # Check if required keys exist
                required_keys = ["tenantId", "id", "instanceName", "version"]
                missing_keys = [key for key in required_keys if key not in seg]
                if missing_keys:
                    logger.warning(f"Segment {i+1} is missing required keys: {missing_keys}")
                    logger.warning(f"Segment data: {seg}")
                    continue
                
                data = {
                    "pk": seg["tenantId"],
                    "sk": "SEG#"+seg["id"],
                    "name": seg["instanceName"],
                    "encrypted": seg.get("encrypted","Unknown"),
                    "version": seg["version"]
                }
                
                logger.info(f"Putting segment {i+1} in DynamoDB: {data['pk']}, {data['sk']}")
                self.table.put_item(Item=data)
                segments.append(data)
                
            logger.info(f"Successfully processed {len(segments)} segments")
            return segments

        except json.JSONDecodeError as err:
            logger.error(f"JSON decode error: {err}", exc_info=True)
            logger.error(f"Raw response data: {response_data[:1000]}")
            raise Exception(f"Error decoding JSON response: {err}. Raw data: {response_data[:500]}") from err
        except urllib3.exceptions.HTTPError as err:
            logger.error(f"HTTP error: {err}", exc_info=True)
            raise Exception(f"HTTP error: {err}") from err
        except Exception as err:
            logger.error(f"Unexpected error in get_segment_names: {err}", exc_info=True)
            raise Exception(f"Error retrieving segment names: {err}") from err

    def get_sites(self):
        """
        Call the Nile API to get a list of tenant site names using urllib3.

        :return: A list of site names.
        :raises Exception: When the API call fails or returns no data.
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
        
        logger.info("get_sites method called")
        
        if not self.api_token:
            logger.error("No API token provided")
            raise Exception("API key is required. Please provide it in the x-api-key header.")
            
        if not self.tenant_id:
            logger.error("No tenant ID provided")
            raise Exception("Tenant ID is required. Please provide it in the x-tenant-id header.")
            
        # Include tenant ID and API key in the headers
        # Note: The API expects the API key in the Authorization header with the Bearer prefix
        headers = {
            'Authorization': f'Bearer {self.api_token}',
            'x-tenant-id': self.tenant_id
        }
        
        final_url = f"{self.url}/api/v1/sites"
        
        logger.info(f"Request URL: {final_url}")
        logger.info(f"Request headers: {headers}")
            
        http = urllib3.PoolManager()
        try:
            logger.info("Sending HTTP request")
            
            # Add retry logic for 401 responses
            max_retries = 5
            retry_count = 0
            response = None
            
            while retry_count <= max_retries:
                if retry_count > 0:
                    # Calculate random backoff time between 1 and 5 seconds
                    import random
                    import time
                    backoff = random.uniform(1, 5)
                    logger.info(f"Retry {retry_count}/{max_retries} after {backoff:.2f} seconds backoff")
                    time.sleep(backoff)
                
                # Add timeout to the request
                response = http.request(
                    "GET", 
                    final_url, 
                    headers=headers,
                    timeout=30.0,  # 30 second timeout
                    retries=3      # Retry up to 3 times for network issues
                )
                
                logger.info(f"Response received. Status: {response.status}")
                logger.info(f"Response headers: {dict(response.headers)}")
                
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
            data = json.loads(response_data)
            logger.info(f"Data type: {type(data)}")
            
            # Check if 'content' key exists in the response
            if 'content' not in data:
                logger.error("No 'content' key in response")
                logger.error(f"Response keys: {list(data.keys())}")
                raise Exception(f"Unexpected response format: 'content' key missing. Response: {data}")
                
            result = data['content']
            logger.info(f"Found {len(result)} sites in response")
            
            if not result:
                logger.warning("No sites found in response")
                raise Exception("Could not get Site Name. Likely no sites exist.")

            sites = []
            for i, site in enumerate(result):
                logger.info(f"Processing site {i+1}/{len(result)}")
                
                # Check if required keys exist
                required_keys = ["tenantId", "id", "name", "address"]
                missing_keys = [key for key in required_keys if key not in site]
                if missing_keys:
                    logger.warning(f"Site {i+1} is missing required keys: {missing_keys}")
                    logger.warning(f"Site data: {site}")
                    continue
                
                data = {
                    "pk": site['tenantId'],
                    "sk": "S#" + site['id'],
                    "name": site['name'],
                    "description": site.get("description","Unknown"),
                    "address": site['address']
                }
                
                logger.info(f"Putting site {i+1} in DynamoDB: {data['pk']}, {data['sk']}")
                self.table.put_item(Item=data)
                sites.append(data)
                
            logger.info(f"Successfully processed {len(sites)} sites")
            return sites

        except json.JSONDecodeError as err:
            logger.error(f"JSON decode error: {err}", exc_info=True)
            logger.error(f"Raw response data: {response_data[:1000]}")
            raise Exception(f"Error decoding JSON response: {err}. Raw data: {response_data[:500]}") from err
        except urllib3.exceptions.HTTPError as err:
            logger.error(f"HTTP error: {err}", exc_info=True)
            raise Exception(f"HTTP error: {err}") from err
        except Exception as err:
            logger.error(f"Unexpected error in get_sites: {err}", exc_info=True)
            raise Exception(f"Error retrieving site names: {err}") from err

    def get_buildings(self):
        """
        Call the Nile API to get a list of tenant building names using urllib3.

        :return: A list of buildings names.
        :raises Exception: When the API call fails or returns no data.
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
        
        logger.info("get_buildings method called")
        
        if not self.api_token:
            logger.error("No API token provided")
            raise Exception("API key is required. Please provide it in the x-api-key header.")
            
        if not self.tenant_id:
            logger.error("No tenant ID provided")
            raise Exception("Tenant ID is required. Please provide it in the x-tenant-id header.")
            
        # Include tenant ID and API key in the headers
        # Note: The API expects the API key in the Authorization header with the Bearer prefix
        headers = {
            'Authorization': f'Bearer {self.api_token}',
            'x-tenant-id': self.tenant_id
        }
        
        final_url = f"{self.url}/api/v1/buildings"
        
        logger.info(f"Request URL: {final_url}")
        logger.info(f"Request headers: {headers}")
            
        http = urllib3.PoolManager()
        try:
            logger.info("Sending HTTP request")
            
            # Add retry logic for 401 responses
            max_retries = 5
            retry_count = 0
            response = None
            
            while retry_count <= max_retries:
                if retry_count > 0:
                    # Calculate random backoff time between 1 and 5 seconds
                    import random
                    import time
                    backoff = random.uniform(1, 5)
                    logger.info(f"Retry {retry_count}/{max_retries} after {backoff:.2f} seconds backoff")
                    time.sleep(backoff)
                
                # Add timeout to the request
                response = http.request(
                    "GET", 
                    final_url, 
                    headers=headers,
                    timeout=30.0,  # 30 second timeout
                    retries=3      # Retry up to 3 times for network issues
                )
                
                logger.info(f"Response received. Status: {response.status}")
                logger.info(f"Response headers: {dict(response.headers)}")
                
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
            data = json.loads(response_data)
            logger.info(f"Data type: {type(data)}")
            
            # Check if 'content' key exists in the response
            if 'content' not in data:
                logger.error("No 'content' key in response")
                logger.error(f"Response keys: {list(data.keys())}")
                raise Exception(f"Unexpected response format: 'content' key missing. Response: {data}")
                
            result = data['content']
            logger.info(f"Found {len(result)} buildings in response")
            
            if not result:
                logger.warning("No buildings found in response")
                raise Exception("Could not get Building Names. Likely no buildings exist.")

            buildings = []
            for i, bldg in enumerate(result):
                logger.info(f"Processing building {i+1}/{len(result)}")
                
                # Check if required keys exist
                required_keys = ["tenantId", "siteId", "id", "name", "address"]
                missing_keys = [key for key in required_keys if key not in bldg]
                if missing_keys:
                    logger.warning(f"Building {i+1} is missing required keys: {missing_keys}")
                    logger.warning(f"Building data: {bldg}")
                    continue
                
                data = {
                    "pk": bldg["tenantId"],
                    "sk": "B#" + bldg["siteId"] + "#" + bldg['id'],
                    "name": bldg["name"],
                    "description": bldg.get("description","Unknown"),
                    "address": bldg["address"]
                }
                
                logger.info(f"Putting building {i+1} in DynamoDB: {data['pk']}, {data['sk']}")
                self.table.put_item(Item=data)
                buildings.append(data)
                
            logger.info(f"Successfully processed {len(buildings)} buildings")
            return buildings

        except json.JSONDecodeError as err:
            logger.error(f"JSON decode error: {err}", exc_info=True)
            logger.error(f"Raw response data: {response_data[:1000]}")
            raise Exception(f"Error decoding JSON response: {err}. Raw data: {response_data[:500]}") from err
        except urllib3.exceptions.HTTPError as err:
            logger.error(f"HTTP error: {err}", exc_info=True)
            raise Exception(f"HTTP error: {err}") from err
        except Exception as err:
            logger.error(f"Unexpected error in get_buildings: {err}", exc_info=True)
            raise Exception(f"Error retrieving building names: {err}") from err


    def get_floors(self):
        """
        Call the Nile API to get a list of tenant building floors using urllib3.

        :return: A list of floors names.
        :raises Exception: When the API call fails or returns no data.
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
        
        logger.info("get_floors method called")
        
        if not self.api_token:
            logger.error("No API token provided")
            raise Exception("API key is required. Please provide it in the x-api-key header.")
            
        if not self.tenant_id:
            logger.error("No tenant ID provided")
            raise Exception("Tenant ID is required. Please provide it in the x-tenant-id header.")
            
        # Include tenant ID and API key in the headers
        # Note: The API expects the API key in the Authorization header with the Bearer prefix
        headers = {
            'Authorization': f'Bearer {self.api_token}',
            'x-tenant-id': self.tenant_id
        }
        
        final_url = f"{self.url}/api/v1/floors"
        
        logger.info(f"Request URL: {final_url}")
        logger.info(f"Request headers: {headers}")
            
        http = urllib3.PoolManager()
        try:
            logger.info("Sending HTTP request")
            
            # Add retry logic for 401 responses
            max_retries = 5
            retry_count = 0
            response = None
            
            while retry_count <= max_retries:
                if retry_count > 0:
                    # Calculate random backoff time between 1 and 5 seconds
                    import random
                    import time
                    backoff = random.uniform(1, 5)
                    logger.info(f"Retry {retry_count}/{max_retries} after {backoff:.2f} seconds backoff")
                    time.sleep(backoff)
                
                # Add timeout to the request
                response = http.request(
                    "GET", 
                    final_url, 
                    headers=headers,
                    timeout=30.0,  # 30 second timeout
                    retries=3      # Retry up to 3 times for network issues
                )
                
                logger.info(f"Response received. Status: {response.status}")
                logger.info(f"Response headers: {dict(response.headers)}")
                
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
            data = json.loads(response_data)
            logger.info(f"Data type: {type(data)}")
            
            # Check if 'content' key exists in the response
            if 'content' not in data:
                logger.error("No 'content' key in response")
                logger.error(f"Response keys: {list(data.keys())}")
                raise Exception(f"Unexpected response format: 'content' key missing. Response: {data}")
                
            result = data['content']
            logger.info(f"Found {len(result)} floors in response")
            
            if not result:
                logger.warning("No floors found in response")
                raise Exception("Could not get Floor Names. Likely no floors exist.")

            floors = []
            for i, floor in enumerate(result):
                logger.info(f"Processing floor {i+1}/{len(result)}")
                
                # Check if required keys exist
                required_keys = ["tenantId", "siteId", "buildingId", "id", "name", "number"]
                missing_keys = [key for key in required_keys if key not in floor]
                if missing_keys:
                    logger.warning(f"Floor {i+1} is missing required keys: {missing_keys}")
                    logger.warning(f"Floor data: {floor}")
                    continue
                
                data = {
                    "pk": floor["tenantId"],
                    "sk": "F#" + floor["siteId"] + "#" + floor["buildingId"] + "#" + floor["id"],
                    "name": floor["name"],
                    "description": floor.get("description","Unknown"),
                    "number": floor["number"]
                }
                
                logger.info(f"Putting floor {i+1} in DynamoDB: {data['pk']}, {data['sk']}")
                self.table.put_item(Item=data)
                floors.append(data)
                
            logger.info(f"Successfully processed {len(floors)} floors")
            return floors

        except json.JSONDecodeError as err:
            logger.error(f"JSON decode error: {err}", exc_info=True)
            logger.error(f"Raw response data: {response_data[:1000]}")
            raise Exception(f"Error decoding JSON response: {err}. Raw data: {response_data[:500]}") from err
        except urllib3.exceptions.HTTPError as err:
            logger.error(f"HTTP error: {err}", exc_info=True)
            raise Exception(f"HTTP error: {err}") from err
        except Exception as err:
            logger.error(f"Unexpected error in get_floors: {err}", exc_info=True)
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
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
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
            logger.warning("No API key headers found in event (checked x-api-key and Authorization)")
        
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
    
    # Initialize the tenantUpdate class with the API key and tenant ID
    logger.info("Initializing tenantUpdate class")
    tenant_update = tenantUpdate(api_key=api_key, tenant_id=tenant_id)

    try:
        logger.info("Calling get_segment_names method")
        segments = tenant_update.get_segment_names()
        logger.info(f"Successfully retrieved {len(segments)} segments")
        
        logger.info("Calling get_sites method")
        sites = tenant_update.get_sites()
        logger.info(f"Successfully retrieved {len(sites)} sites")
        
        logger.info("Calling get_buildings method")
        buildings = tenant_update.get_buildings()
        logger.info(f"Successfully retrieved {len(buildings)} buildings")
        
        logger.info("Calling get_floors method")
        floors = tenant_update.get_floors()
        logger.info(f"Successfully retrieved {len(floors)} floors")

        logger.info("All data retrieved successfully")
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps('Site(s), Building(s), Floor(s), and Segment(s) updated successfully.')
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
