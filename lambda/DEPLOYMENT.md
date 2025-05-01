# Lambda Functions Deployment Guide

This guide explains how to deploy the updated Lambda functions to AWS.

## Prerequisites

- AWS CLI installed and configured with appropriate credentials
- Python 3.9 or later
- Zip utility

## Packaging the Lambda Functions

The Lambda functions need to be packaged with the `utils.py` module. A script is provided to automate this process:

```bash
# Navigate to the lambda directory
cd lambda

# Run the packaging script
./package_lambdas.sh
```

This will create zip files in the `deployment` directory for each Lambda function.

## Deploying to AWS Lambda

### Option 1: Using the AWS CLI

For each Lambda function, run the following command:

```bash
aws lambda update-function-code \
  --function-name <function-name> \
  --zip-file fileb://deployment/<function-name>.zip
```

Replace `<function-name>` with the name of your Lambda function in AWS (e.g., `nileTree`, `nileSites`, etc.).

Example:

```bash
aws lambda update-function-code \
  --function-name nileTree \
  --zip-file fileb://deployment/nileTree.zip
```

### Option 2: Using the AWS Management Console

1. Sign in to the AWS Management Console
2. Navigate to the Lambda service
3. Select your Lambda function
4. Click on the "Code" tab
5. Click on "Upload from" and select ".zip file"
6. Upload the corresponding zip file from the `deployment` directory
7. Click "Save"

Repeat for each Lambda function.

## Verifying the Deployment

After deploying the Lambda functions, you should verify that they are working correctly:

1. Navigate to the Lambda service in the AWS Management Console
2. Select one of your Lambda functions
3. Click on the "Test" tab
4. Create a new test event with the following JSON:

```json
{
  "headers": {
    "x-api-key": "your-api-key",
    "x-tenant-id": "your-tenant-id"
  }
}
```

5. Click "Test" to execute the Lambda function
6. Verify that the function returns the expected response

### Enhanced Floor Data

The `nileFloors.py` Lambda function has been enhanced to include site and building names in the floor data. This allows the frontend to display more user-friendly information instead of just IDs. The function now:

1. Loads site and building data from DynamoDB
2. Caches the site and building names by ID
3. Includes the site and building names in the floor data
4. Returns the enhanced floor data to the frontend

This enhancement improves the user experience by showing meaningful names instead of just IDs in the UI.

## Troubleshooting

If you encounter any issues with the deployed Lambda functions, check the CloudWatch Logs:

1. Navigate to the CloudWatch service in the AWS Management Console
2. Click on "Log groups"
3. Find the log group for your Lambda function (usually `/aws/lambda/<function-name>`)
4. Check the latest log stream for any error messages

Common issues:

- **Missing utils module**: Make sure the `utils.py` file is included in the zip file
- **Permission issues**: Ensure the Lambda execution role has the necessary permissions to access DynamoDB
- **Environment variables**: Check that any required environment variables are set correctly
