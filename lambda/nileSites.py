"""
Lambda function to retrieve site information from DynamoDB.
"""

from typing import Dict, Any, List

from utils import NileBaseHandler, standard_lambda_handler


class NileSiteHandler(NileBaseHandler):
    """Handler for site-related operations."""

    def get_sites(self) -> List[Dict[str, Any]]:
        """
        Get a list of tenant sites from DynamoDB.

        Returns:
            List of site objects with their details.
            
        Raises:
            Exception: If no sites exist or if there's an error retrieving them.
        """
        # Query items with the site prefix
        result = self.query_items("S#")
        
        if not result:
            raise Exception("No sites found for this tenant.")

        # Transform the raw DynamoDB items into a more usable format
        sites = []
        for site in result:
            data = {
                "tenantid": site['pk'],
                "siteid": site['sk'].split('#')[1],
                "name": site['name'],
                "address": site['address']
            }
            sites.append(data)
            
        return sites


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda handler function.
    
    Args:
        event: The Lambda event
        context: The Lambda context
        
    Returns:
        API Gateway response
    """
    return standard_lambda_handler(event, context, NileSiteHandler, 'get_sites')
