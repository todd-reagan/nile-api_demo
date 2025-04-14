# NileMobile

A modern web application for network management and monitoring, displaying real-time data from various APIs including building information, network devices, and site details.

## Features

- Building information display
- Network device monitoring
- Site management
- Responsive design with Tailwind CSS
- Static site generation for AWS S3 hosting

## Prerequisites

- Node.js 18.x or later
- AWS account with S3 access
- AWS CLI configured with appropriate credentials

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/nilemobile.git
cd nilemobile
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Deployment to AWS S3

1. Create an S3 bucket:
   - Go to AWS S3 console
   - Create a new bucket with a unique name (e.g., `nilemobile-website`)
   - Enable static website hosting in the bucket properties
   - Set the index document to `index.html`
   - Set the error document to `404.html`

2. Configure bucket policy:
   - Go to the bucket's Permissions tab
   - Add the following bucket policy (replace `your-bucket-name` with your actual bucket name):
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        }
    ]
}
```

3. Configure CORS (Cross-Origin Resource Sharing):
   - Go to the bucket's Permissions tab
   - Add the following CORS configuration:
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```

4. Build and deploy the project:
```bash
# Build the project
npm run build

# Install AWS CLI if not already installed
npm install -g aws-cli

# Configure AWS credentials
aws configure

# Deploy to S3
aws s3 sync ./out s3://your-bucket-name --delete
```

5. Configure CloudFront (recommended for production):
   - Create a CloudFront distribution
   - Set the S3 bucket as the origin
   - Configure caching settings:
     - Default TTL: 3600 (1 hour)
     - Minimum TTL: 0
     - Maximum TTL: 86400 (24 hours)
   - Enable HTTPS
   - Set up SSL certificate
   - Update your domain's DNS settings to point to the CloudFront distribution

## Development

To run the development server:
```bash
npm run dev
```

## Environment Variables

Create a `.env.local` file in the root directory for local development:
```env
# API Endpoints
NEXT_PUBLIC_BUILDING_API=https://shs53efu7ww47ytm7ljslxtvbe0cjdyt.lambda-url.us-west-2.on.aws/
NEXT_PUBLIC_DEVICE_API=https://ld5kktc7qjg42pybjunukka3qq0ewtqd.lambda-url.us-west-2.on.aws/
```

## License

MIT
