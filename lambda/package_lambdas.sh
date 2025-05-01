#!/bin/bash
# Script to package Lambda functions for deployment

# Create deployment directory if it doesn't exist
mkdir -p deployment

# Package each Lambda function
for lambda_file in nileSites.py nileBldg.py nileFloors.py nileSegments.py nileTree.py; do
  echo "Packaging $lambda_file..."
  
  # Create a temporary directory for this Lambda
  lambda_name=$(basename $lambda_file .py)
  temp_dir="deployment/temp_$lambda_name"
  mkdir -p $temp_dir
  
  # Copy the Lambda function and utils.py to the temp directory
  cp $lambda_file $temp_dir/
  cp utils.py $temp_dir/
  
  # Create a zip file
  cd $temp_dir
  zip -r ../$lambda_name.zip .
  cd ../..
  
  # Clean up
  rm -rf $temp_dir
  
  echo "Created deployment/$(basename $lambda_name).zip"
done

echo "All Lambda functions packaged successfully!"
