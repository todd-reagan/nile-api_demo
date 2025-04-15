# NileMobile

Network management and monitoring platform.

## Features

- Building information display
- Network device monitoring
- Site management

## Prerequisites

- Node.js 18.17 or later
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

3. Create a `.env.local` file in the root directory with the following variables:
```env
NEXT_PUBLIC_API_URL=https://ld5kktc7qjg42pybjunukka3qq0ewtqd.lambda-url.us-west-2.on.aws/
```

## Development

Run the development server:
```bash
npm run dev
```

## Deployment to AWS S3

1. Build the application for static export:
```bash
npm run build
```
This will create a static export in the `out` directory.

2. Create an S3 bucket for hosting:
```bash
aws s3 mb s3://your-bucket-name
```

3. Configure the S3 bucket for static website hosting:
```bash
aws s3 website s3://your-bucket-name --index-document index.html --error-document 404.html
```

4. Configure bucket policy for public access:
```bash
aws s3api put-bucket-policy --bucket your-bucket-name --policy file://bucket-policy.json
```

5. Configure CORS for the bucket:
```bash
aws s3api put-bucket-cors --bucket your-bucket-name --cors-configuration file://cors-config.json
```

6. Deploy the built files:
```bash
aws s3 sync out/ s3://your-bucket-name --delete
```

7. (Optional) Set up CloudFront for production:
- Create a CloudFront distribution
- Set the origin to your S3 bucket
- Configure the distribution to use the S3 website endpoint
- Set up SSL certificate for HTTPS

## Environment Variables

The following environment variables are used in the application:

- `NEXT_PUBLIC_API_URL`: The base URL for the API endpoints
  - Default: `https://ld5kktc7qjg42pybjunukka3qq0ewtqd.lambda-url.us-west-2.on.aws/`

## License

MIT
