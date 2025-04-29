# Nile Mobile Dashboard

A Next.js application for network management and monitoring.

## Project Structure

The project has been organized with a focus on maintainability, reusability, and performance:

```
app/
├── components/
│   ├── TreeView.tsx
│   ├── auth/
│   │   └── ProtectedRoute.tsx
│   └── ui/
│       ├── Card.tsx
│       ├── DataItem.tsx
│       ├── ErrorDisplay.tsx
│       ├── ErrorState.tsx
│       ├── LoadingSpinner.tsx
│       ├── LoadingState.tsx
│       ├── Navigation.tsx
│       ├── PageLayout.tsx
│       ├── ReturnToDashboard.tsx
│       ├── ReturnToDevices.tsx
│       └── index.ts
├── config/
│   └── cognito.ts
├── constants/
│   └── index.ts
├── contexts/
│   └── AuthContext.tsx
├── hooks/
│   ├── useFetch.ts
│   ├── useForm.ts
│   └── index.ts
├── services/
│   ├── api.ts
│   ├── auth.ts
│   └── apiKeyApi.ts
├── types/
│   └── index.ts
├── utils/
│   └── dataTransformers.ts
├── bldg/
│   └── page.tsx
├── clients/
│   └── page.tsx
├── devices/
│   └── page.tsx
├── floor/
│   └── page.tsx
├── login/
│   └── page.tsx
├── macauth/
│   └── page.tsx
├── overview/
│   └── page.tsx
├── port-viewer/
│   └── page.tsx
├── profile/
│   └── page.tsx
├── segments/
│   └── page.tsx
├── signup/
│   └── page.tsx
├── sites/
│   └── page.tsx
├── update/
│   └── page.tsx
├── favicon.ico
├── globals.css
├── layout.tsx
└── page.tsx
```

## Features

- Dashboard with links to different sections
- Overview of tenant hierarchy
- Site information management
- Building information management
- Floor information management
- Network segments management
- Client information with device details
- Device approval and authentication
- Port viewer for switch port connectivity
- Database update functionality
- Raw API data views for debugging and development

## Recent Improvements

### API Data Visualization

- Added raw JSON views to key pages (Sites, Buildings, Floors, Segments) for direct API response inspection
- Created a new Client Information page that displays client device data in a card-based format
- Implemented robust retry logic with variable backoff for API calls to handle 401 errors
- Added copy-to-clipboard functionality for all raw JSON data

### Port Viewer

- Added a visual port viewer for switch port connectivity
- Implemented port coloring based on network segment assignments
- Added responsive design for different screen sizes

### Code Organization

- Created a shared `/types` directory for interface definitions
- Implemented reusable UI components in `/components/ui`
- Centralized API calls in a service layer
- Added utility functions for data transformation
- Created custom hooks for data fetching and form handling
- Extracted constants to a dedicated file

### UI Components

- `LoadingSpinner`: Consistent loading indicator
- `ErrorDisplay`: Standardized error messaging
- `PageLayout`: Consistent page structure
- `ReturnToDashboard`: Navigation component
- `LoadingState`: Full-page loading state
- `ErrorState`: Full-page error state
- `Card`: Reusable card component for displaying information
- `DataItem`: Component for displaying key-value pairs

### Custom Hooks

- `useFetch`: Simplifies data fetching with loading and error states
- `useForm`: Handles form state management

### Utilities

- `dataTransformers.ts`: Functions for parsing and formatting data

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

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
