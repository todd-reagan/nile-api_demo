#!/bin/bash
# Script to package Lambda functions for deployment

# Create deployment directory if it doesn't exist
mkdir -p deployment

# Package each Lambda function
for lambda_file in nileSites.py nileBldg.py nileFloors.py nileSegments.py nileTree.py nileTenantUpdate.py nileMABUpdate.py nileApiKeys.py; do
  echo "Packaging $lambda_file..."
  
  # Create a temporary directory for this Lambda
  lambda_name=$(basename $lambda_file .py)
  temp_dir="deployment/temp_$lambda_name"
  mkdir -p $temp_dir
  
  # Copy the Lambda function and utility files to the temp directory
  cp $lambda_file $temp_dir/
  
  # Copy api_utils.py if the Lambda function is nileTenantUpdate.py or nileMABUpdate.py
  if [[ "$lambda_file" == "nileTenantUpdate.py" || "$lambda_file" == "nileMABUpdate.py" ]]; then
    cp api_utils.py $temp_dir/
  fi
  
  # Create a zip file
  cd $temp_dir
  zip -r ../$lambda_name.zip .
  cd ../..
  
  # Clean up
  rm -rf $temp_dir
  
  echo "Created deployment/$(basename $lambda_name).zip"
done

echo "All Lambda functions packaged successfully!"
