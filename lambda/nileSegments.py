"""
Lambda function to retrieve network segment information from DynamoDB.
"""

from typing import Dict, Any, List

from utils import NileBaseHandler, standard_lambda_handler


class NileSegmentHandler(NileBaseHandler):
    """Handler for network segment-related operations."""

    def get_segments(self) -> List[Dict[str, Any]]:
        """
        Get a list of tenant network segments from DynamoDB with enhanced details.

        Returns:
            List of segment objects with their details.
            
        Raises:
            Exception: If no segments exist or if there's an error retrieving them.
        """
        # Query items with the segment prefix
        result = self.query_items("SEG#")
        
        if not result:
            raise Exception("No network segments found for this tenant.")

        # Transform the raw DynamoDB items into a more usable format
        segments = []
        for seg in result:
            # Create base data object
            data = {
                "tenantid": seg['pk'],
                "segment": seg['name'],
                "id": seg.get('id', ''),
                "name": seg.get('name', ''),
                "encrypted": seg.get('encrypted', False),
                "version": seg.get('version', ''),
                "useTags": seg.get('useTags', False),
                "settingStatus": seg.get('settingStatus', ''),
                "tagIds": seg.get('tagIds', [])
            }
            
            # Add segment details if available
            if 'segmentDetails' in seg:
                data['segmentDetails'] = seg['segmentDetails']
            
            # Add geo scope if available
            if 'geoScope' in seg:
                data['geoScope'] = seg['geoScope']
            
            # Add linked settings if available
            if 'linkedSettings' in seg:
                data['linkedSettings'] = seg['linkedSettings']
            
            segments.append(data)
            
        return segments


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda handler function.
    
    Args:
        event: The Lambda event
        context: The Lambda context
        
    Returns:
        API Gateway response
    """
    return standard_lambda_handler(event, context, NileSegmentHandler, 'get_segments')
