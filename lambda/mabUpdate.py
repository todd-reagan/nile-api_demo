"""
Lambda function to retrieve client data from the Nile API.
"""

import boto3
from typing import Dict, Any, List

from utils import standard_lambda_handler
from api_utils import NileApiClient


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


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda handler function.
    
    Args:
        event: The Lambda event
        context: The Lambda context
        
    Returns:
        API Gateway response
    """
    return standard_lambda_handler(event, context, MabUpdateHandler, 'get_clients')
