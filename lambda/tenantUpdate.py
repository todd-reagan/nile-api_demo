"""
Lambda function to update tenant data from the Nile API.
"""

import json
import boto3
from typing import Dict, Any, List

from utils import standard_lambda_handler
from api_utils import NileApiClient


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
        segments_data = self.api_client.get_segments()
        
        # Process and store segments in DynamoDB
        segments = []
        for seg in segments_data:
            # Check if required keys exist
            required_keys = ["tenantId", "id", "instanceName", "version"]
            missing_keys = [key for key in required_keys if key not in seg]
            if missing_keys:
                continue
            
            data = {
                "pk": seg["tenantId"],
                "sk": "SEG#" + seg["id"],
                "name": seg["instanceName"],
                "encrypted": seg.get("encrypted", "Unknown"),
                "version": seg["version"]
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
        sites_data = self.api_client.get_sites()
        
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
        buildings_data = self.api_client.get_buildings()
        
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
        floors_data = self.api_client.get_floors()
        
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
