// Amazon Cognito configuration

// NOTE: This is an example configuration file.
// In a production environment, these values should be loaded from environment variables
// or a secure configuration management system.
export const COGNITO_CONFIG = {
  REGION: process.env.NEXT_PUBLIC_AWS_REGION || 'us-west-2',
  USER_POOL_ID: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'your-user-pool-id',
  APP_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_APP_CLIENT_ID || 'your-app-client-id',
};
