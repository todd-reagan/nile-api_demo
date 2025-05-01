"""
Lambda function to retrieve floor information from DynamoDB.
"""

from typing import Dict, Any, List

from utils import NileBaseHandler, standard_lambda_handler


class NileFloorHandler(NileBaseHandler):
    """Handler for floor-related operations."""

    def get_floors(self) -> List[Dict[str, Any]]:
        """
        Get a list of tenant floors from DynamoDB.

        Returns:
            List of floor objects with their details.
            
        Raises:
            Exception: If no floors exist or if there's an error retrieving them.
        """
        # Query items with the floor prefix
        result = self.query_items("F#")
        
        if not result:
            raise Exception("No floors found for this tenant.")

        # Transform the raw DynamoDB items into a more usable format
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
