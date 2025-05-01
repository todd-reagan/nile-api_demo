# Nile API Lambda Functions

This directory contains AWS Lambda functions that power the Nile API Demo backend. These functions are designed to be deployed behind API Gateway to provide RESTful API endpoints for the frontend application.

## Architecture

The Lambda functions follow a standardized architecture:

1. Each function is responsible for a specific resource (sites, buildings, floors, segments, etc.)
2. All functions share common utilities from `utils.py`
3. Each function uses a handler class that extends the `NileBaseHandler` base class
4. All functions use a standardized Lambda handler pattern

## Files

- `utils.py` - Common utilities and base classes for all Lambda functions
- `nileTree.py` - Retrieves the complete tenant hierarchy (sites, buildings, floors)
- `nileSites.py` - Retrieves site information
- `nileBldg.py` - Retrieves building information
- `nileFloors.py` - Retrieves floor information
- `nileSegments.py` - Retrieves network segment information
- `tenantUpdate.py` - Updates tenant data
- `mabUpdate.py` - Updates MAC address binding data

## Data Model

The Lambda functions interact with a DynamoDB table with the following structure:

- **Partition Key (pk)**: Tenant ID
- **Sort Key (sk)**: Hierarchical key with prefixes:
  - `S#<site_id>` - Site records
  - `B#<site_id>#<building_id>` - Building records
  - `F#<site_id>#<building_id>#<floor_id>` - Floor records
  - `SEG#<segment_id>` - Network segment records

## Authentication and Authorization

The Lambda functions expect the following headers:

- `x-api-key` - API key for authentication
- `x-tenant-id` - Tenant ID for authorization and data filtering

## Deployment

These Lambda functions are designed to be deployed to AWS Lambda using AWS CloudFormation or the AWS CLI. Each function should be configured with:

1. Python 3.9+ runtime
2. IAM role with permissions to access DynamoDB
3. Environment variables:
   - `DEBUG` - Set to "true" to enable debug logging

## API Endpoints

When deployed behind API Gateway, the Lambda functions provide the following endpoints:

- `GET /tree` - Get the complete tenant hierarchy
- `GET /sites` - Get all sites for a tenant
- `GET /bldgs` - Get all buildings for a tenant
- `GET /floors` - Get all floors for a tenant
- `GET /segments` - Get all network segments for a tenant
- `POST /tenantupdate` - Update tenant data

## Error Handling

All Lambda functions use a standardized error handling approach:

1. Errors are caught and returned with a 500 status code
2. Error responses include detailed information about the error
3. CORS headers are included in all responses
