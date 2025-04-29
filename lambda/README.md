# API Keys Management Lambda Function

This directory contains the AWS Lambda function and CloudFormation template for managing API keys in a DynamoDB table. The function is designed to work with Amazon Cognito for authentication and API Gateway for HTTP endpoints.

## Overview

The solution consists of:

1. A Python Lambda function (`api_keys_handler.py`) that handles CRUD operations for API keys
2. A DynamoDB table with a composite key (userId + keyId) to store API keys
3. An API Gateway REST API with Cognito User Pool authorization
4. A CloudFormation template to deploy all these resources

## DynamoDB Table Design

The DynamoDB table uses the following key structure:

- **Partition Key (HASH)**: `userId` - The Cognito user ID
- **Sort Key (RANGE)**: `keyId` - A unique identifier for each API key

Additional attributes:
- `name`: A user-friendly name for the API key
- `key`: The actual API key value
- `service`: The service the API key is for (e.g., "Google Maps", "OpenAI")
- `createdAt`: Timestamp when the key was created
- `updatedAt`: Timestamp when the key was last updated

This design allows for:
- Efficient retrieval of all API keys for a specific user
- Direct access to a specific API key using both userId and keyId
- Proper isolation of data between users

## API Endpoints

The Lambda function exposes the following endpoints through API Gateway:

- **GET /api-keys**: Retrieve all API keys for the authenticated user
- **POST /api-keys**: Create a new API key
- **PUT /api-keys**: Update an existing API key
- **DELETE /api-keys**: Delete an API key

All endpoints require authentication with a valid Cognito token.

## Deployment Instructions

### Prerequisites

1. AWS CLI installed and configured
2. An existing Amazon Cognito User Pool
3. Python 3.9 or later

### Deployment Steps

1. **Package the Lambda function**:

   ```bash
   cd lambda
   zip -r function.zip api_keys_handler.py
   ```

2. **Deploy using CloudFormation**:

   ```bash
   aws cloudformation deploy \
     --template-file cloudformation.yaml \
     --stack-name api-keys-management \
     --parameter-overrides \
       CognitoUserPoolId=<your-cognito-user-pool-id> \
     --capabilities CAPABILITY_IAM
   ```

3. **Update the Lambda function code**:

   ```bash
   aws lambda update-function-code \
     --function-name ApiKeysHandler \
     --zip-file fileb://function.zip
   ```

4. **Get the API Gateway endpoint URL**:

   ```bash
   aws cloudformation describe-stacks \
     --stack-name api-keys-management \
     --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayEndpoint'].OutputValue" \
     --output text
   ```

## Integration with Frontend

To integrate this backend with the frontend application, you'll need to update the auth service to use the API Gateway endpoints instead of the in-memory storage.

1. Create a new file `app/services/apiKeyApi.ts` with the following content:

```typescript
import { getJwtToken } from './auth';

const API_ENDPOINT = 'https://your-api-gateway-endpoint.execute-api.region.amazonaws.com/prod/api-keys';

export async function fetchApiKeys() {
  const token = await getJwtToken();
  if (!token) {
    throw new Error('User is not authenticated');
  }

  const response = await fetch(API_ENDPOINT, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch API keys: ${response.statusText}`);
  }

  const data = await response.json();
  return data.apiKeys;
}

export async function createApiKey(name: string, key: string, service: string) {
  const token = await getJwtToken();
  if (!token) {
    throw new Error('User is not authenticated');
  }

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, key, service })
  });

  if (!response.ok) {
    throw new Error(`Failed to create API key: ${response.statusText}`);
  }

  return await response.json();
}

export async function updateApiKey(keyId: string, name: string, key: string, service: string) {
  const token = await getJwtToken();
  if (!token) {
    throw new Error('User is not authenticated');
  }

  const response = await fetch(API_ENDPOINT, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ keyId, name, key, service })
  });

  if (!response.ok) {
    throw new Error(`Failed to update API key: ${response.statusText}`);
  }

  return await response.json();
}

export async function deleteApiKey(keyId: string) {
  const token = await getJwtToken();
  if (!token) {
    throw new Error('User is not authenticated');
  }

  const response = await fetch(`${API_ENDPOINT}?keyId=${keyId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to delete API key: ${response.statusText}`);
  }

  return await response.json();
}
```

2. Update the auth service to use these API functions instead of the in-memory storage.

## Security Considerations

- API keys are stored in DynamoDB and are accessible only to the user who created them
- All API requests require a valid Cognito token
- The Lambda function validates that users can only access their own API keys
- Consider encrypting sensitive data in the DynamoDB table using AWS KMS

## Future Improvements

- Add encryption for API key values using AWS KMS
- Implement pagination for the GET endpoint
- Add filtering and sorting options
- Add monitoring and alerting for suspicious activities
- Implement rate limiting to prevent abuse
