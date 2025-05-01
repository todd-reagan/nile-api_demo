// Amazon Cognito configuration

// NOTE: This is an example configuration file.
// In a production environment, these values should be loaded from environment variables
// or a secure configuration management system.

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Only use actual Cognito configuration in the browser
// During server-side rendering or static site generation, use dummy values
export const COGNITO_CONFIG = {
  REGION: isBrowser && process.env.NEXT_PUBLIC_AWS_REGION ? process.env.NEXT_PUBLIC_AWS_REGION : 'us-west-2',
  USER_POOL_ID: isBrowser && process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ? process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID : 'us-west-2_dummypool',
  APP_CLIENT_ID: isBrowser && process.env.NEXT_PUBLIC_COGNITO_APP_CLIENT_ID ? process.env.NEXT_PUBLIC_COGNITO_APP_CLIENT_ID : '1234567890abcdefghij',
};
