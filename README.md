# Nile API Demo

A Next.js application for demonstration of Nile Public APIs.

These are just some ideas on how the APIs could be used, always excited to see what Nile partners and customers build!


### Port Viewer

- Integration/adaptation of [Todd Ellison's Project](https://github.com/ToddEllison/NilePortDemo)


## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Create a .env.local file from the example
cp .env.example .env.local
# Edit .env.local with your actual configuration values
```

### Environment Variables

This project uses environment variables for configuration. Create a `.env.local` file based on the provided `.env.example` and fill in your values:

- `NEXT_PUBLIC_AWS_REGION`: Your AWS region
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID`: Your Cognito User Pool ID
- `NEXT_PUBLIC_COGNITO_APP_CLIENT_ID`: Your Cognito App Client ID
- `NEXT_PUBLIC_API_BASE_URL`: Your API Gateway endpoint
- `NEXT_PUBLIC_AUTH_API_URL`: Your authentication API endpoint

### Building for Production

```bash
# Build the application for static export
npm run build

# The output will be in the 'out' directory, ready for deployment to S3 or other static hosting
```

## Deployment to AWS S3

This application is configured for static hosting on AWS S3. The following changes have been made to support S3 hosting:

1. Updated `next.config.js` with:
   - `output: 'export'` for static HTML export
   - `images: { unoptimized: true }` for static image handling
   - `trailingSlash: false` for URL formatting

2. All internal links use `.html` extension:
   - Dashboard links in `constants/index.ts`
   - Return to Dashboard links in `ReturnToDashboard.tsx`
   - Navigation links in various pages

When deploying to S3:
1. Upload the contents of the `out` directory to your S3 bucket
2. Configure the bucket for static website hosting
3. Set the index document to `index.html`
4. Set appropriate permissions for public access

## Technologies Used

- Next.js 15.3.0
- React 19.0.0
- TypeScript
- Tailwind CSS 4
- react-complex-tree (for tree view components)

## License

MIT License

Copyright (c) 2025 Nile Global Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
