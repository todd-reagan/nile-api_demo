"""
Lambda function to retrieve building information from DynamoDB.
"""

from typing import Dict, Any, List

from utils import NileBaseHandler, standard_lambda_handler


class NileBuildingHandler(NileBaseHandler):
    """Handler for building-related operations."""

    def get_buildings(self) -> List[Dict[str, Any]]:
        """
        Get a list of tenant buildings from DynamoDB.

        Returns:
            List of building objects with their details.
            
        Raises:
            Exception: If no buildings exist or if there's an error retrieving them.
        """
        # Query items with the building prefix
        result = self.query_items("B#")
        
        if not result:
            raise Exception("No buildings found for this tenant.")

        # Transform the raw DynamoDB items into a more usable format
        buildings = []
        for bldg in result:
            data = {
                "tenantid": bldg['pk'],
                "siteid": bldg['sk'].split('#')[1],
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
