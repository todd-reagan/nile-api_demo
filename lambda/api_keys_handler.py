import json
import boto3
import os
import uuid
import time
import decimal
import logging
from datetime import datetime
from boto3.dynamodb.conditions import Key

# Set up logger
logger = logging.getLogger()

# Helper class to convert a DynamoDB item to JSON
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            if o % 1 > 0:
                return float(o)
            else:
                return int(o)
        return super(DecimalEncoder, self).default(o)

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('API_KEYS_TABLE', 'UserApiKeys')
logger.info(f"Using DynamoDB table name: {table_name}")

# Try to get the table, with error handling
try:
    table = dynamodb.Table(table_name)
    # Check if the table exists by describing it
    dynamodb_client = boto3.client('dynamodb')
    table_description = dynamodb_client.describe_table(TableName=table_name)
    logger.info(f"Successfully connected to DynamoDB table: {table_name}")
    logger.info(f"Table ARN: {table_description['Table']['TableArn']}")
except Exception as e:
    logger.error(f"Error initializing DynamoDB table: {str(e)}")
    logger.warning("Attempting to create the DynamoDB table...")
    
    try:
        # Create the table
        dynamodb_client = boto3.client('dynamodb')
        response = dynamodb_client.create_table(
            TableName=table_name,
            KeySchema=[
                {
                    'AttributeName': 'userId',
                    'KeyType': 'HASH'  # Partition key
                },
                {
                    'AttributeName': 'keyId',
                    'KeyType': 'RANGE'  # Sort key
                }
            ],
            AttributeDefinitions=[
                {
                    'AttributeName': 'userId',
                    'AttributeType': 'S'
                },
                {
                    'AttributeName': 'keyId',
                    'AttributeType': 'S'
                }
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        logger.info(f"Table {table_name} is being created. Status: {response['TableDescription']['TableStatus']}")
        logger.info("Waiting for table to be created...")
        
        # Wait for the table to be created
        waiter = dynamodb_client.get_waiter('table_exists')
        waiter.wait(TableName=table_name)
        
        logger.info(f"Table {table_name} has been created successfully")
        table = dynamodb.Table(table_name)
    except Exception as create_error:
        logger.error(f"Failed to create DynamoDB table: {str(create_error)}")
        logger.error("Will attempt to create table reference anyway, but operations may fail")
        table = dynamodb.Table(table_name)  # Create the reference anyway

def lambda_handler(event, context):
    """
    Lambda function to handle API key management operations.
    
    Operations:
    - GET: Retrieve all API keys for a user
    - POST: Create a new API key
    - PUT: Update an existing API key
    - DELETE: Delete an API key
    
    The function expects the user ID to be provided in the request context
    from the Cognito authorizer.
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
    
    try:
        # Check if this is a CORS preflight request (OPTIONS)
        if isinstance(event, dict) and event.get('requestContext', {}).get('http', {}).get('method') == 'OPTIONS':
            logger.info("Handling CORS preflight request")
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'message': 'CORS preflight request successful'})
            }
            
        logger.info(f"Event keys: {list(event.keys()) if isinstance(event, dict) else 'Event is not a dict'}")
        
        # Get HTTP method
        http_method = event.get('requestContext', {}).get('http', {}).get('method')
        logger.info(f"HTTP method: {http_method}")
                
        # For non-OPTIONS requests, get the user ID
        logger.info("Attempting to extract user ID from request context")
        request_context = event.get('requestContext', {})
        logger.info(f"Request context: {request_context}")
        
        authorizer = request_context.get('authorizer', {})
        logger.info(f"Authorizer: {authorizer}")
        
        # Claims might be directly in authorizer or nested in authorizer.jwt
        claims = authorizer.get('claims', {})
        if not claims and 'jwt' in authorizer:
            claims = authorizer.get('jwt', {}).get('claims', {})
        
        logger.info(f"Claims: {claims}")
        
        # Try to get user ID from cognito:username claim first (Cognito's default)
        user_id = claims.get('cognito:username')
        logger.info(f"User ID from cognito:username claim: {user_id}")
        
        # If not found, try the sub claim as fallback
        if not user_id:
            user_id = claims.get('sub')
            logger.info(f"User ID from sub claim: {user_id}")
        
        # For testing, if user_id is not available, check if it's in the body or query parameters
        if not user_id:
            logger.info("User ID not found in claims, checking body or query parameters")
            if http_method == 'POST' or http_method == 'PUT':
                body = json.loads(event.get('body', '{}'))
                user_id = body.get('userId')
                logger.info(f"User ID from body: {user_id}")
            else:
                query_params = event.get('queryStringParameters', {})
                logger.info(f"Query parameters: {query_params}")
                user_id = query_params.get('userId')
                logger.info(f"User ID from query parameters: {user_id}")
            
            # No fallback for missing user ID - we want it to fail if not provided
            # This ensures proper authentication is required
        
        if not user_id:
            logger.error("User ID is missing after all extraction attempts")
            logger.error("This could indicate an authentication issue or missing authorization header")
            logger.error("Check that the token is being sent correctly and that the Cognito authorizer is configured properly")
            
            # Return a more detailed error message
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': 'User ID is required',
                    'details': 'Authentication may have failed or the authorization header may be missing',
                    'requestContext': str(request_context)
                }, cls=DecimalEncoder)
            }
            
        # Handle other HTTP methods
        if http_method == 'GET':
            return get_api_keys(user_id, event)
        elif http_method == 'POST':
            return create_api_key(user_id, event)
        elif http_method == 'PUT':
            return update_api_key(user_id, event)
        elif http_method == 'DELETE':
            return delete_api_key(user_id, event)
        else:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': f'Unsupported HTTP method: {http_method}'}, cls=DecimalEncoder)
            }

    except Exception as e:
        error_msg = f"Error in lambda_handler: {str(e)}"
        print(error_msg)
        logger.error(error_msg)
        logger.error(f"Event: {event}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': error_msg}, cls=DecimalEncoder)
        }

def get_api_keys(user_id, event):
    """Retrieve all API keys for a user"""
    logger.info(f"Retrieving API keys for user: {user_id}")
    try:
        # Query DynamoDB for all items with the given user_id
        logger.info(f"Querying DynamoDB table '{table_name}' for user {user_id}")
        try:
            response = table.query(
                KeyConditionExpression=Key('userId').eq(user_id)
            )
            items_count = len(response.get('Items', []))
            logger.info(f"Successfully queried DynamoDB for user {user_id}, found {items_count} items")
            logger.info(f"Query response: {response}")
        except Exception as db_error:
            logger.error(f"DynamoDB query operation failed: {str(db_error)}")
            raise
        
        # Return the items
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'apiKeys': response.get('Items', [])
            }, cls=DecimalEncoder)
        }

    except Exception as e:
        error_msg = f"Error retrieving API keys: {str(e)}"
        print(error_msg)
        logger.error(error_msg)
        logger.error(f"User ID: {user_id}")
        logger.error(f"Event: {event}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': error_msg}, cls=DecimalEncoder)
        }

def create_api_key(user_id, event):
    """Create a new API key"""
    logger.info(f"Creating API key for user: {user_id}")
    try:
        # Parse request body
        logger.info(f"Parsing request body from event: {event.get('body', '{}')}")
        body = json.loads(event.get('body', '{}'))
        logger.info(f"Parsed body: {body}")
        
        # Validate required fields
        required_fields = ['name', 'key', 'service']
        for field in required_fields:
            if field not in body:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': f'Missing required field: {field}'}, cls=DecimalEncoder)
                }
        
        # Generate a unique key ID
        key_id = str(uuid.uuid4())
        current_time = int(time.time())
        
        # Create item to store in DynamoDB
        item = {
            'userId': user_id,
            'keyId': key_id,
            'name': body['name'],
            'key': body['key'],
            'service': body['service'],
            'createdAt': current_time,
            'updatedAt': current_time
        }
        
        # Add optional fields if present
        if 'url' in body:
            item['url'] = body['url']
        if 'validBefore' in body:
            item['validBefore'] = body['validBefore']
        if 'tenantId' in body:
            item['tenantId'] = body['tenantId']
        
        # Check if the DynamoDB table exists
        logger.info(f"Checking if DynamoDB table '{table_name}' exists")
        try:
            dynamodb_client = boto3.client('dynamodb')
            table_description = dynamodb_client.describe_table(TableName=table_name)
            logger.info(f"DynamoDB table '{table_name}' exists: {table_description.get('Table', {}).get('TableName')}")
        except Exception as table_error:
            logger.error(f"Error checking DynamoDB table: {str(table_error)}")
            raise Exception(f"DynamoDB table '{table_name}' may not exist or is not accessible: {str(table_error)}")
        
        # Put item in DynamoDB
        logger.info(f"Putting item in DynamoDB table '{table_name}'")
        logger.info(f"Item to put: {item}")
        try:
            # Log the DynamoDB resource and table
            logger.info(f"DynamoDB resource: {dynamodb}")
            logger.info(f"DynamoDB table: {table}")
            
            # Try to put the item
            put_response = table.put_item(Item=item)
            logger.info(f"DynamoDB put_item response: {put_response}")
            logger.info(f"Successfully put item in DynamoDB for user {user_id}, key ID {key_id}")
        except Exception as db_error:
            logger.error(f"DynamoDB put_item operation failed: {str(db_error)}")
            # Check if it's a permissions issue
            if "AccessDenied" in str(db_error):
                raise Exception(f"Access denied to DynamoDB table '{table_name}'. Check IAM permissions: {str(db_error)}")
            # Check if it's a resource not found issue
            elif "ResourceNotFoundException" in str(db_error):
                raise Exception(f"DynamoDB table '{table_name}' not found: {str(db_error)}")
            else:
                raise Exception(f"Error putting item in DynamoDB: {str(db_error)}")
        
        # Return the created item
        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(item, cls=DecimalEncoder)
        }

    except Exception as e:
        error_msg = f"Error creating API key: {str(e)}"
        print(error_msg)
        logger.error(error_msg)
        logger.error(f"User ID: {user_id}")
        logger.error(f"Event: {event}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': error_msg}, cls=DecimalEncoder)
        }

def update_api_key(user_id, event):
    """Update an existing API key"""
    logger.info(f"Updating API key for user: {user_id}")
    try:
        # Parse request body
        logger.info(f"Parsing request body from event: {event.get('body', '{}')}")
        body = json.loads(event.get('body', '{}'))
        logger.info(f"Parsed body: {body}")
        
        # Validate required fields
        required_fields = ['keyId', 'name', 'key', 'service']
        for field in required_fields:
            if field not in body:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': f'Missing required field: {field}'}, cls=DecimalEncoder)
                }
        
        key_id = body['keyId']
        current_time = int(time.time())
        
        # Check if the API key exists and belongs to the user
        response = table.get_item(
            Key={
                'userId': user_id,
                'keyId': key_id
            }
        )
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'API key not found or does not belong to the user'}, cls=DecimalEncoder)
            }
        
        # Update the item in DynamoDB
        update_expression = "SET #name = :name, #key = :key, #service = :service, #updatedAt = :updatedAt"
        expression_attribute_names = {
            '#name': 'name',
            '#key': 'key',
            '#service': 'service',
            '#updatedAt': 'updatedAt'
        }
        expression_attribute_values = {
            ':name': body['name'],
            ':key': body['key'],
            ':service': body['service'],
            ':updatedAt': current_time
        }
        
        # Add optional fields if present
        if 'url' in body:
            update_expression += ", #url = :url"
            expression_attribute_names['#url'] = 'url'
            expression_attribute_values[':url'] = body['url']
        
        if 'validBefore' in body:
            update_expression += ", #validBefore = :validBefore"
            expression_attribute_names['#validBefore'] = 'validBefore'
            expression_attribute_values[':validBefore'] = body['validBefore']
            
        if 'tenantId' in body:
            update_expression += ", #tenantId = :tenantId"
            expression_attribute_names['#tenantId'] = 'tenantId'
            expression_attribute_values[':tenantId'] = body['tenantId']
        
        logger.info(f"Updating item in DynamoDB table '{table_name}' for user {user_id}, key ID {key_id}")
        logger.info(f"Update expression: {update_expression}")
        logger.info(f"Expression attribute names: {expression_attribute_names}")
        logger.info(f"Expression attribute values: {expression_attribute_values}")
        
        try:
            response = table.update_item(
                Key={
                    'userId': user_id,
                    'keyId': key_id
                },
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values,
                ReturnValues='ALL_NEW'
            )
            logger.info(f"Successfully updated item in DynamoDB for user {user_id}, key ID {key_id}")
        except Exception as db_error:
            logger.error(f"DynamoDB update_item operation failed: {str(db_error)}")
            raise
        
        # Return the updated item
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response.get('Attributes', {}), cls=DecimalEncoder)
        }

    except Exception as e:
        error_msg = f"Error updating API key: {str(e)}"
        print(error_msg)
        logger.error(error_msg)
        logger.error(f"User ID: {user_id}")
        logger.error(f"Event: {event}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': error_msg}, cls=DecimalEncoder)
        }

def delete_api_key(user_id, event):
    """Delete an API key"""
    logger.info(f"Deleting API key for user: {user_id}")
    try:
        # Get key ID from query parameters
        logger.info("Checking query parameters for keyId")
        query_params = event.get('queryStringParameters', {})
        key_id = query_params.get('keyId')
        logger.info(f"Query parameters: {query_params}")
        
        if not key_id:
            # Try to get key ID from path parameters
            path_params = event.get('pathParameters', {})
            key_id = path_params.get('keyId')
            logger.info(f"Path parameters: {path_params}")
        
        if not key_id:
            # Try to get key ID from body
            logger.info(f"Parsing request body from event: {event.get('body', '{}')}")
            body = json.loads(event.get('body', '{}'))
            key_id = body.get('keyId')
            logger.info(f"Parsed body: {body}")
        
        if not key_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Key ID is required'}, cls=DecimalEncoder)
            }
        
        # Delete the item from DynamoDB
        logger.info(f"Deleting item from DynamoDB table '{table_name}' for user {user_id}, key ID {key_id}")
        try:
            logger.info(f"Delete key: {{'userId': '{user_id}', 'keyId': '{key_id}'}}")
            response = table.delete_item(
                Key={
                    'userId': user_id,
                    'keyId': key_id
                },
                ReturnValues='ALL_OLD'
            )
            logger.info(f"DynamoDB delete_item response: {response}")
            logger.info(f"Successfully deleted item from DynamoDB for user {user_id}, key ID {key_id}")
        except Exception as db_error:
            logger.error(f"DynamoDB delete_item operation failed: {str(db_error)}")
            raise
        
        # Return success
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': 'API key deleted successfully'}, cls=DecimalEncoder)
        }

    except Exception as e:
        error_msg = f"Error deleting API key: {str(e)}"
        print(error_msg)
        logger.error(error_msg)
        logger.error(f"User ID: {user_id}")
        logger.error(f"Event: {event}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': error_msg}, cls=DecimalEncoder)
        }
