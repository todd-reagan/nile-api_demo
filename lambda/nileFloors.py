"""
Lambda function to retrieve floor information from DynamoDB with enhanced location details.
"""

import logging
from typing import Dict, Any, List, Optional

from utils import NileBaseHandler, standard_lambda_handler

# Configure logging
logger = logging.getLogger()

class NileFloorHandler(NileBaseHandler):
    """Handler for floor-related operations."""

    def __init__(self, api_key: Optional[str] = None, tenant_id: Optional[str] = None):
        """
        Initialize the NileFloorHandler.
        
        Args:
            api_key: The API key to use for authentication
            tenant_id: The tenant ID to use for querying data
        """
        super().__init__(api_key, tenant_id)
        
        # Cache for site and building names
        self.sites_cache: Dict[str, Dict[str, Any]] = {}
        self.buildings_cache: Dict[str, Dict[str, Any]] = {}
    
    def load_site_data(self) -> None:
        """
        Load site data for name lookups.
        """
        try:
            # Query items with the site prefix
            sites_result = self.query_items("S#")
            
            # Build a cache of site names by ID
            for site in sites_result:
                site_id = site['sk'].split('#')[1]
                self.sites_cache[site_id] = {
                    "name": site.get('name', 'Unknown'),
                    "address": site.get('address', {})
                }
            
            logger.info(f"Loaded {len(self.sites_cache)} sites")
        except Exception as e:
            logger.error(f"Error loading site data: {e}")
            # Continue with empty cache rather than failing completely
    
    def load_building_data(self) -> None:
        """
        Load building data for name lookups.
        """
        try:
            # Query items with the building prefix
            buildings_result = self.query_items("B#")
            
            # Build a cache of building names by ID
            for building in buildings_result:
                building_id = building['sk'].split('#')[2]
                self.buildings_cache[building_id] = {
                    "name": building.get('name', 'Unknown'),
                    "siteid": building['sk'].split('#')[1],
                    "address": building.get('address', {})
                }
            
            logger.info(f"Loaded {len(self.buildings_cache)} buildings")
        except Exception as e:
            logger.error(f"Error loading building data: {e}")
            # Continue with empty cache rather than failing completely
    
    def get_site_name(self, site_id: str) -> str:
        """Get the name of a site by its ID."""
        return self.sites_cache.get(site_id, {}).get('name', 'Unknown')
    
    def get_building_name(self, building_id: str) -> str:
        """Get the name of a building by its ID."""
        return self.buildings_cache.get(building_id, {}).get('name', 'Unknown')

    def get_floors(self) -> List[Dict[str, Any]]:
        """
        Get a list of tenant floors from DynamoDB with enhanced location details.

        Returns:
            List of floor objects with their details including site and building names.
            
        Raises:
            Exception: If no floors exist or if there's an error retrieving them.
        """
        # Load site and building data for name lookups
        self.load_site_data()
        self.load_building_data()
        
        # Query items with the floor prefix
        result = self.query_items("F#")
        
        if not result:
            raise Exception("No floors found for this tenant.")

        # Transform the raw DynamoDB items into a more usable format
        floors = []
        for floor in result:
            site_id = floor['sk'].split('#')[1]
            building_id = floor['sk'].split('#')[2]
            
            # Look up site and building names
            site_name = self.get_site_name(site_id)
            building_name = self.get_building_name(building_id)
            
            data = {
                "tenantid": floor['pk'],
                "siteid": site_id,
                "siteName": site_name,
                "bldgid": building_id,
                "buildingName": building_name,
                "floorid": floor['sk'].split('#')[3],
                "name": floor['name'],
                "number": str(floor['number'])
            }
            floors.append(data)
            
        return floors


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda handler function.
    
    Args:
        event: The Lambda event
        context: The Lambda context
        
    Returns:
        API Gateway response
    """
    return standard_lambda_handler(event, context, NileFloorHandler, 'get_floors')
