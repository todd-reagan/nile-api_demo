'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CognitoUser } from 'amazon-cognito-identity-js';
import * as authService from '../services/auth';
import { UserAttributes, ApiKey } from '../services/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: CognitoUser | null;
  userAttributes: UserAttributes | null;
  apiKeys: ApiKey[];
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string, attributes: UserAttributes) => Promise<any>;
  confirmRegistration: (username: string, code: string) => Promise<any>;
  signOut: () => void;
  updateUserAttributes: (attributes: UserAttributes) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  addApiKey: (apiKey: Omit<ApiKey, 'id'>) => Promise<ApiKey>;
  updateApiKey: (apiKey: ApiKey) => Promise<ApiKey>;
  deleteApiKey: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<CognitoUser | null>(null);
  const [userAttributes, setUserAttributes] = useState<UserAttributes | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);

  // Check if user is authenticated on mount
  useEffect(() => {
    // Skip authentication check during server-side rendering
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        // Check if we have valid Cognito credentials
        const hasValidConfig = 
          process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID && 
          process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID !== 'your-user-pool-id' &&
          process.env.NEXT_PUBLIC_COGNITO_APP_CLIENT_ID && 
          process.env.NEXT_PUBLIC_COGNITO_APP_CLIENT_ID !== 'your-app-client-id';

        // Skip authentication if we don't have valid credentials
        if (!hasValidConfig) {
          console.warn('Skipping authentication check due to missing or invalid Cognito configuration');
          setIsLoading(false);
          return;
        }

        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
          
          // Get user attributes
          const attributes = await authService.getUserAttributes();
          setUserAttributes(attributes);
          
          // Get user API keys
          const keys = await authService.getUserApiKeys();
          setApiKeys(keys);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Sign in handler
  const handleSignIn = async (username: string, password: string) => {
    try {
      await authService.signIn(username, password);
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
        
        // Get user attributes
        const attributes = await authService.getUserAttributes();
        setUserAttributes(attributes);
        
        // Get user API keys
        const keys = await authService.getUserApiKeys();
        setApiKeys(keys);
      }
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  // Sign up handler
  const handleSignUp = async (username: string, password: string, attributes: UserAttributes) => {
    try {
      return await authService.signUp(username, password, attributes);
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  // Confirm registration handler
  const handleConfirmRegistration = async (username: string, code: string) => {
    try {
      return await authService.confirmRegistration(username, code);
    } catch (error) {
      console.error('Error confirming registration:', error);
      throw error;
    }
  };

  // Sign out handler
  const handleSignOut = () => {
    authService.signOut();
    setUser(null);
    setIsAuthenticated(false);
    setUserAttributes(null);
    setApiKeys([]);
  };

  // Update user attributes handler
  const handleUpdateUserAttributes = async (attributes: UserAttributes) => {
    try {
      await authService.updateUserAttributes(attributes);
      const updatedAttributes = await authService.getUserAttributes();
      setUserAttributes(updatedAttributes);
    } catch (error) {
      console.error('Error updating user attributes:', error);
      throw error;
    }
  };

  // Change password handler
  const handleChangePassword = async (oldPassword: string, newPassword: string) => {
    try {
      await authService.changePassword(oldPassword, newPassword);
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  };

  // Add API key handler
  const handleAddApiKey = async (apiKey: Omit<ApiKey, 'id'>) => {
    try {
      const newKey = await authService.addApiKey(apiKey);
      setApiKeys([...apiKeys, newKey]);
      return newKey;
    } catch (error) {
      console.error('Error adding API key:', error);
      throw error;
    }
  };

  // Update API key handler
  const handleUpdateApiKey = async (apiKey: ApiKey) => {
    try {
      const updatedKey = await authService.updateApiKey(apiKey);
      setApiKeys(apiKeys.map((key) => (key.id === apiKey.id ? updatedKey : key)));
      return updatedKey;
    } catch (error) {
      console.error('Error updating API key:', error);
      throw error;
    }
  };

  // Delete API key handler
  const handleDeleteApiKey = async (id: string) => {
    try {
      await authService.deleteApiKey(id);
      setApiKeys(apiKeys.filter((key) => key.id !== id));
    } catch (error) {
      console.error('Error deleting API key:', error);
      throw error;
    }
  };

  const value = {
    isAuthenticated,
    isLoading,
    user,
    userAttributes,
    apiKeys,
    signIn: handleSignIn,
    signUp: handleSignUp,
    confirmRegistration: handleConfirmRegistration,
    signOut: handleSignOut,
    updateUserAttributes: handleUpdateUserAttributes,
    changePassword: handleChangePassword,
    addApiKey: handleAddApiKey,
    updateApiKey: handleUpdateApiKey,
    deleteApiKey: handleDeleteApiKey,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
