"""
Lambda function to retrieve building information from DynamoDB with enhanced location details.
"""

import logging
from typing import Dict, Any, List, Optional

from utils import NileBaseHandler, standard_lambda_handler

# Configure logging
logger = logging.getLogger()

class NileBuildingHandler(NileBaseHandler):
    """Handler for building-related operations."""

    def __init__(self, api_key: Optional[str] = None, tenant_id: Optional[str] = None):
        """
        Initialize the NileBuildingHandler.
        
        Args:
            api_key: The API key to use for authentication
            tenant_id: The tenant ID to use for querying data
        """
        super().__init__(api_key, tenant_id)
        
        # Cache for site names
        self.sites_cache: Dict[str, Dict[str, Any]] = {}
    
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
    
    def get_site_name(self, site_id: str) -> str:
        """Get the name of a site by its ID."""
        return self.sites_cache.get(site_id, {}).get('name', 'Unknown')

    def get_buildings(self) -> List[Dict[str, Any]]:
        """
        Get a list of tenant buildings from DynamoDB with enhanced location details.

        Returns:
            List of building objects with their details including site names.
            
        Raises:
            Exception: If no buildings exist or if there's an error retrieving them.
        """
        # Load site data for name lookups
        self.load_site_data()
        
        # Query items with the building prefix
        result = self.query_items("B#")
        
        if not result:
            raise Exception("No buildings found for this tenant.")

        # Transform the raw DynamoDB items into a more usable format
        buildings = []
        for bldg in result:
            site_id = bldg['sk'].split('#')[1]
            
            # Look up site name
            site_name = self.get_site_name(site_id)
            
            data = {
                "tenantid": bldg['pk'],
                "siteid": site_id,
                "siteName": site_name,
                "bldgid": bldg['sk'].split('#')[2],
                "name": bldg['name'],
                "address": bldg['address']
            }
            buildings.append(data)
            
        return buildings


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda handler function.
    
    Args:
        event: The Lambda event
        context: The Lambda context
        
    Returns:
        API Gateway response
    """
    return standard_lambda_handler(event, context, NileBuildingHandler, 'get_buildings')
