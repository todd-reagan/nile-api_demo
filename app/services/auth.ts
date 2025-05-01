'use client';

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { COGNITO_CONFIG } from '../config/cognito';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Create a user pool with the configuration
// Only create it if we're in a browser environment
const userPool = isBrowser ? new CognitoUserPool({
  UserPoolId: COGNITO_CONFIG.USER_POOL_ID,
  ClientId: COGNITO_CONFIG.APP_CLIENT_ID,
}) : null;

// Interface for user attributes
export interface UserAttributes {
  email?: string;
  name?: string;
  [key: string]: string | undefined;
}

// Interface for API key
export interface ApiKey {
  id: string;
  name: string;
  key: string;
  service: string;
  url?: string;
  validBefore?: string; // ISO date string format: "2026-04-04T20:37:00Z"
  tenantId?: string; // Optional tenant identifier
}

// Sign up a new user
export const signUp = async (
  username: string,
  password: string,
  attributes: UserAttributes
): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!userPool) {
      reject(new Error('Cognito User Pool is not initialized'));
      return;
    }

    // Convert attributes to CognitoUserAttributes
    const attributeList = Object.keys(attributes).map((key) => {
      return new CognitoUserAttribute({
        Name: key,
        Value: attributes[key] as string,
      });
    });

    userPool.signUp(
      username,
      password,
      attributeList,
      [],
      (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      }
    );
  });
};

// Confirm registration with verification code
export const confirmRegistration = async (
  username: string,
  code: string
): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!userPool) {
      reject(new Error('Cognito User Pool is not initialized'));
      return;
    }

    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: userPool,
    });

    cognitoUser.confirmRegistration(code, true, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
};

// Sign in a user
export const signIn = async (
  username: string,
  password: string
): Promise<CognitoUserSession> => {
  return new Promise((resolve, reject) => {
    if (!userPool) {
      reject(new Error('Cognito User Pool is not initialized'));
      return;
    }

    const authenticationDetails = new AuthenticationDetails({
      Username: username,
      Password: password,
    });

    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: userPool,
    });

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (session) => {
        resolve(session);
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
};

// Sign out the current user
export const signOut = (): void => {
  if (!userPool) {
    console.warn('Cognito User Pool is not initialized');
    return;
  }
  
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
  }
};

// Get the current authenticated user
export const getCurrentUser = (): Promise<CognitoUser | null> => {
  return new Promise((resolve) => {
    if (!userPool) {
      console.warn('Cognito User Pool is not initialized');
      resolve(null);
      return;
    }
    
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
      resolve(null);
      return;
    }

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }
      resolve(cognitoUser);
    });
  });
};

// Get the current user's session
export const getCurrentSession = (): Promise<CognitoUserSession | null> => {
  return new Promise((resolve) => {
    if (!userPool) {
      console.warn('Cognito User Pool is not initialized');
      resolve(null);
      return;
    }
    
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
      resolve(null);
      return;
    }

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }
      resolve(session);
    });
  });
};

// Get the current user's attributes
export const getUserAttributes = (): Promise<UserAttributes | null> => {
  return new Promise((resolve, reject) => {
    if (!userPool) {
      console.warn('Cognito User Pool is not initialized');
      resolve(null);
      return;
    }
    
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
      resolve(null);
      return;
    }

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }

      cognitoUser.getUserAttributes((err, attributes) => {
        if (err) {
          reject(err);
          return;
        }

        if (!attributes) {
          resolve({});
          return;
        }

        const userAttributes: UserAttributes = {};
        attributes.forEach((attribute) => {
          userAttributes[attribute.getName()] = attribute.getValue();
        });

        resolve(userAttributes);
      });
    });
  });
};

// Update user attributes
export const updateUserAttributes = async (
  attributes: UserAttributes
): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!userPool) {
      reject(new Error('Cognito User Pool is not initialized'));
      return;
    }
    
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
      reject(new Error('No user is currently signed in'));
      return;
    }

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        reject(new Error('User session is invalid'));
        return;
      }

      // Convert attributes to CognitoUserAttributes
      const attributeList = Object.keys(attributes).map((key) => {
        return new CognitoUserAttribute({
          Name: key,
          Value: attributes[key] as string,
        });
      });

      cognitoUser.updateAttributes(attributeList, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  });
};

// Change password
export const changePassword = async (
  oldPassword: string,
  newPassword: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!userPool) {
      reject(new Error('Cognito User Pool is not initialized'));
      return;
    }
    
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
      reject(new Error('No user is currently signed in'));
      return;
    }

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        reject(new Error('User session is invalid'));
        return;
      }

      cognitoUser.changePassword(oldPassword, newPassword, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  });
};

// Get JWT token from session
export const getJwtToken = async (): Promise<string | null> => {
  const session = await getCurrentSession();
  return session?.getIdToken().getJwtToken() || null;
};

// API key management functions
// These functions delegate to the apiKeyApi service which interacts with the backend
import * as apiKeyApi from './apiKeyApi';

// Get API keys for the current user
export const getUserApiKeys = async (): Promise<ApiKey[]> => {
  try {
    return await apiKeyApi.fetchApiKeys();
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return [];
  }
};

// Add a new API key
export const addApiKey = async (apiKey: Omit<ApiKey, 'id'>): Promise<ApiKey> => {
  return await apiKeyApi.createApiKey(
    apiKey.name, 
    apiKey.key, 
    apiKey.service, 
    apiKey.url, 
    apiKey.validBefore,
    apiKey.tenantId
  );
};

// Update an existing API key
export const updateApiKey = async (apiKey: ApiKey): Promise<ApiKey> => {
  return await apiKeyApi.updateApiKey(
    apiKey.id, 
    apiKey.name, 
    apiKey.key, 
    apiKey.service, 
    apiKey.url, 
    apiKey.validBefore,
    apiKey.tenantId
  );
};

// Delete an API key
export const deleteApiKey = async (id: string): Promise<void> => {
  await apiKeyApi.deleteApiKey(id);
};
