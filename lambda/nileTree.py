"""
Lambda function to retrieve tenant hierarchy information from DynamoDB.
"""

from typing import Dict, Any, List, Optional
import json

from utils import NileBaseHandler, standard_lambda_handler


class NileTreeHandler(NileBaseHandler):
    """Handler for tenant hierarchy operations."""

    def transform_hierarchy(self, raw_data: List[List[Dict[str, Any]]]) -> Dict[str, Any]:
        """
        Transform the raw data into a hierarchical structure.
        
        Args:
            raw_data: A list of lists containing sites, buildings, and floors
            
        Returns:
            A hierarchical structure of the tenant's data
            
        Raises:
            Exception: If there's an error transforming the hierarchy
        """
        try:
            tenant_structure = {}
            
            # If raw_data is empty or doesn't contain any items, return a minimal structure
            if not raw_data or all(not group for group in raw_data):
                return {"tenantid": self.tenant_id, "sites": []}
            
            for group in raw_data:
                for item in group:
                    # Skip items that don't have the required fields
                    if "tenantid" not in item:
                        continue
                        
                    tenant_id = item["tenantid"]
                    site_id = item.get("siteid")
                    bldg_id = item.get("bldgid")
                    floor_id = item.get("floorid")
                    
                    # Skip items that don't have a site ID
                    if not site_id:
                        continue

                    # Init tenant level
                    if "tenantid" not in tenant_structure:
                        tenant_structure["tenantid"] = tenant_id
                        tenant_structure["sites"] = []

                    # Find or create site
                    site = next((s for s in tenant_structure["sites"] if s["siteid"] == site_id), None)
                    if not site:
                        try:
                            address_data = {}
                            if "address" in item:
                                if isinstance(item["address"], str):
                                    address_data = json.loads(item["address"])
                                elif isinstance(item["address"], dict):
                                    address_data = item["address"]
                        except Exception as e:
                            print(f"Error parsing address: {e}")
                            address_data = {}
                            
                        site = {
                            "siteid": site_id,
                            "name": item.get("name", ""),
                            "address": address_data,
                            "buildings": []
                        }
                        tenant_structure["sites"].append(site)

                    # If building info is present
                    if bldg_id:
                        building = next((b for b in site["buildings"] if b["bldgid"] == bldg_id), None)
                        if not building:
                            try:
                                address_data = {}
                                if "address" in item:
                                    if isinstance(item["address"], str):
                                        address_data = json.loads(item["address"])
                                    elif isinstance(item["address"], dict):
                                        address_data = item["address"]
                            except Exception as e:
                                print(f"Error parsing address: {e}")
                                address_data = {}
                                
                            building = {
                                "bldgid": bldg_id,
                                "name": item.get("name", ""),
                                "address": address_data,
                                "floors": []
                            }
                            site["buildings"].append(building)

                        # If floor info is present
                        if floor_id:
                            floor = {
                                "floorid": floor_id,
                                "name": item.get("name", ""),
                                "number": item.get("number", "")
                            }
                            building["floors"].append(floor)
            
            return tenant_structure
            
        except Exception as e:
            print(f"Error in transform_hierarchy: {e}")
            # Return a minimal structure if there's an error
            return {"tenantid": self.tenant_id, "sites": [], "error": str(e)}

    def get_buildings(self) -> Dict[str, Any]:
        """
        Get a hierarchical view of tenant sites, buildings, and floors from DynamoDB.

        Returns:
            A hierarchical structure of the tenant's data
            
        Raises:
            Exception: If no data exists or if there's an error retrieving it
        """
        # Initialize variables to empty lists in case any of the queries fail
        sites = []
        buildings = []
        floors = []
        segments = []
        
        # Get sites
        try:
            sites_result = self.query_items("S#")
            
            if sites_result:  # Only process if we have results
                for site in sites_result:
                    data = {
                        "tenantid": site['pk'],
                        "siteid": site['sk'].split('#')[1],
                        "name": site['name'],
                        "address": site['address']
                    }
                    sites.append(data)
        except Exception as err:
            print(f"Error retrieving sites: {err}")
            # Continue with empty sites list rather than failing completely
        
        # Get buildings
        try:
            bldgs_result = self.query_items("B#")
            
            if bldgs_result:  # Only process if we have results
                for bldg in bldgs_result:
                    data = {
                        "tenantid": bldg['pk'],
                        "siteid": bldg['sk'].split('#')[1],
                        "bldgid": bldg['sk'].split('#')[2],
                        "name": bldg['name'],
                        "address": bldg['address']
                    }
                    buildings.append(data)
        except Exception as err:
            print(f"Error retrieving buildings: {err}")
            # Continue with empty buildings list rather than failing completely
        
        # Get floors
        try:
            floors_result = self.query_items("F#")
            
            if floors_result:  # Only process if we have results
                for floor in floors_result:
                    data = {
                        "tenantid": floor['pk'],
                        "siteid": floor['sk'].split('#')[1],
                        "bldgid": floor['sk'].split('#')[2],
                        "floorid": floor['sk'].split('#')[3],
                        "name": floor['name'],
                        "number": str(floor['number'])
                    }
                    floors.append(data)
        except Exception as err:
            print(f"Error retrieving floors: {err}")
            # Continue with empty floors list rather than failing completely
        
        # Get segments
        try:
            segments_result = self.query_items("SEG#")
            
            if segments_result:  # Only process if we have results
                for seg in segments_result:
                    data = {
                        "tenantid": seg['pk'],
                        "segment": seg['name']
                    }
                    segments.append(data)
        except Exception as err:
            print(f"Error retrieving segments: {err}")
            # Continue with empty segments list rather than failing completely
        
        # Check if we have any data at all
        if not sites and not buildings and not floors:
            raise Exception("No data found for the provided tenant ID. Please check that the tenant ID is correct.")
        
        raw_data = [sites, buildings, floors]
        
        try:
            tenant_tree = self.transform_hierarchy(raw_data)
            return tenant_tree
        except Exception as err:
            raise Exception(f"Error transforming hierarchy: {err}") from err


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda handler function.
    
    Args:
        event: The Lambda event
        context: The Lambda context
        
    Returns:
        API Gateway response
    """
    return standard_lambda_handler(event, context, NileTreeHandler, 'get_buildings')
