'use client';

import { useState, useEffect, useRef, DragEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PageLayout, ErrorDisplay, LoadingState } from '../components/ui';
import { ApiKey } from '../services/auth';
import ProtectedRoute from '../components/auth/ProtectedRoute';

export default function ProfilePage() {
  const { isLoading, userAttributes, apiKeys, addApiKey, updateApiKey, deleteApiKey, updateUserAttributes, changePassword } = useAuth();
  
  // User attributes state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  
  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  
  // API key state
  const [showAddApiKey, setShowAddApiKey] = useState(false);
  const [apiKeyName, setApiKeyName] = useState('');
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [apiKeyService, setApiKeyService] = useState('');
  const [apiKeyUrl, setApiKeyUrl] = useState('');
  const [apiKeyValidBefore, setApiKeyValidBefore] = useState('');
  const [apiKeyTenantId, setApiKeyTenantId] = useState('');
  const [isAddingApiKey, setIsAddingApiKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [editingApiKey, setEditingApiKey] = useState<ApiKey | null>(null);
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [dragMessage, setDragMessage] = useState('Drag and drop a JSON file here');
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Set initial values from user attributes
  useEffect(() => {
    if (userAttributes) {
      setName(userAttributes.name || '');
      setEmail(userAttributes.email || '');
    }
  }, [userAttributes]);

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsUpdatingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);
    
    try {
      await updateUserAttributes({ name });
      setProfileSuccess(true);
    } catch (err) {
      console.error('Profile update error:', err);
      if (err instanceof Error) {
        setProfileError(err.message);
      } else {
        setProfileError('An unexpected error occurred while updating profile');
      }
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    setIsChangingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);
    
    try {
      await changePassword(oldPassword, newPassword);
      setPasswordSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Password change error:', err);
      if (err instanceof Error) {
        setPasswordError(err.message);
      } else {
        setPasswordError('An unexpected error occurred while changing password');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle add API key
  const handleAddApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKeyName || !apiKeyValue || !apiKeyService || !apiKeyTenantId) {
      setApiKeyError('Please fill in all API key fields, including Tenant ID');
      return;
    }
    
    setIsAddingApiKey(true);
    setApiKeyError(null);
    
    try {
      await addApiKey({
        name: apiKeyName,
        key: apiKeyValue,
        service: apiKeyService,
        url: apiKeyUrl,
        validBefore: apiKeyValidBefore || undefined,
        tenantId: apiKeyTenantId || undefined,
      });
      
      // Reset form
      setApiKeyName('');
      setApiKeyValue('');
      setApiKeyService('');
      setApiKeyUrl('');
      setApiKeyValidBefore('');
      setApiKeyTenantId('');
      setShowAddApiKey(false);
    } catch (err) {
      console.error('Add API key error:', err);
      if (err instanceof Error) {
        setApiKeyError(err.message);
      } else {
        setApiKeyError('An unexpected error occurred while adding API key');
      }
    } finally {
      setIsAddingApiKey(false);
    }
  };

  // Handle edit API key
  const handleEditApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingApiKey || !apiKeyName || !apiKeyValue || !apiKeyService || !apiKeyTenantId) {
      setApiKeyError('Please fill in all API key fields, including Tenant ID');
      return;
    }
    
    setIsEditingApiKey(true);
    setApiKeyError(null);
    
    try {
      await updateApiKey({
        ...editingApiKey,
        name: apiKeyName,
        key: apiKeyValue,
        service: apiKeyService,
        url: apiKeyUrl,
        validBefore: apiKeyValidBefore || undefined,
        tenantId: apiKeyTenantId || undefined,
      });
      
      // Reset form
      setApiKeyName('');
      setApiKeyValue('');
      setApiKeyService('');
      setApiKeyUrl('');
      setApiKeyValidBefore('');
      setApiKeyTenantId('');
      setEditingApiKey(null);
    } catch (err) {
      console.error('Edit API key error:', err);
      if (err instanceof Error) {
        setApiKeyError(err.message);
      } else {
        setApiKeyError('An unexpected error occurred while editing API key');
      }
    } finally {
      setIsEditingApiKey(false);
    }
  };

  // Handle delete API key
  const handleDeleteApiKey = async (id: string) => {
    try {
      await deleteApiKey(id);
    } catch (err) {
      console.error('Delete API key error:', err);
      setApiKeyError(err instanceof Error ? err.message : 'An unexpected error occurred while deleting API key');
    }
  };

  // Start editing an API key
  const startEditApiKey = (apiKey: ApiKey) => {
    setEditingApiKey(apiKey);
    setApiKeyName(apiKey.name);
    setApiKeyValue(apiKey.key);
    setApiKeyService(apiKey.service);
    setApiKeyUrl(apiKey.url || '');
    setApiKeyValidBefore(apiKey.validBefore || '');
    setApiKeyTenantId(apiKey.tenantId || '');
    setShowAddApiKey(false);
  };

  // Cancel editing or adding API key
  const cancelApiKeyForm = () => {
    setApiKeyName('');
    setApiKeyValue('');
    setApiKeyService('');
    setApiKeyUrl('');
    setApiKeyValidBefore('');
    setApiKeyTenantId('');
    setEditingApiKey(null);
    setShowAddApiKey(false);
    setApiKeyError(null);
  };
  
  // Handle drag events
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragMessage('Drop to upload');
  };
  
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragMessage('Drag and drop a JSON file here');
  };
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragMessage('Drag and drop a JSON file here');
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      // Check if file is JSON
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        setApiKeyError('Please upload a JSON file');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonData = JSON.parse(event.target?.result as string);
          
          // Populate form fields with JSON data
          setApiKeyName(jsonData.name || '');
          // Use api_token as the primary key field
          setApiKeyValue(jsonData.api_token || jsonData.key || jsonData.apiKey || jsonData.token || jsonData.value || '');
          // Always set service to "Nile API" for drag and drop
          setApiKeyService('Nile API');
          setApiKeyUrl(jsonData.url || jsonData.endpoint || '');
          // Use validBeforeTime as the primary valid before field
          setApiKeyValidBefore(jsonData.validBeforeTime || jsonData.validBefore || jsonData.expiry || jsonData.expiryDate || '');
          setApiKeyTenantId(jsonData.tenantId || jsonData.tenant || '');
          
          // Check if any required fields are missing
          if (!jsonData.name || !jsonData.api_token || !jsonData.tenantId) {
            setApiKeyError('The JSON file is missing required fields. Please ensure it contains name, api_token, and tenantId.');
          } else {
            setDragMessage('JSON file parsed successfully!');
            setTimeout(() => {
              setDragMessage('Drag and drop a JSON file here');
            }, 3000);
          }
        } catch (err) {
          console.error('Error parsing JSON:', err);
          setApiKeyError('Invalid JSON file');
        }
      };
      
      reader.readAsText(file);
    }
  };

  // Render profile content
  const renderProfileContent = () => {
    return (
      <PageLayout title="User Profile">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Profile Information */}
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                {/* Email Field (Read-only) */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500 cursor-not-allowed opacity-70"
                    disabled
                  />
                  <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                </div>

                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter your name"
                  />
                </div>

                {/* Error Message */}
                {profileError && <ErrorDisplay message={profileError} />}

                {/* Success Message */}
                {profileSuccess && (
                  <div className="bg-green-800 text-green-100 p-3 rounded-md">
                    Profile updated successfully!
                  </div>
                )}

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password */}
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Change Password</h2>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {/* Current Password Field */}
                <div>
                  <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-300">
                    Current Password
                  </label>
                  <input
                    id="oldPassword"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter current password"
                    required
                  />
                </div>

                {/* New Password Field */}
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter new password"
                    required
                  />
                </div>

                {/* Confirm New Password Field */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Confirm new password"
                    required
                  />
                </div>

                {/* Error Message */}
                {passwordError && <ErrorDisplay message={passwordError} />}

                {/* Success Message */}
                {passwordSuccess && (
                  <div className="bg-green-800 text-green-100 p-3 rounded-md">
                    Password changed successfully!
                  </div>
                )}

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isChangingPassword ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* API Keys Section */}
          <div className="mt-8 bg-gray-800 rounded-lg p-6 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">API Keys</h2>
              {!showAddApiKey && !editingApiKey && (
                <button
                  onClick={() => setShowAddApiKey(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Add API Key
                </button>
              )}
            </div>

            {/* API Key Form (Add or Edit) */}
            {(showAddApiKey || editingApiKey) && (
              <div className="mb-6 bg-gray-700 p-4 rounded-md">
                <h3 className="text-lg font-medium mb-3">
                  {editingApiKey ? 'Edit API Key' : 'Add New API Key'}
                </h3>
                
                {/* Drag and Drop Zone */}
                <div
                  ref={dropZoneRef}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-6 mb-4 text-center transition-colors duration-200 ${
                    isDragging ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center">
                    <svg 
                      className={`w-10 h-10 mb-3 ${isDragging ? 'text-blue-400' : 'text-gray-400'}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={1.5} 
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className={`mb-2 text-sm ${isDragging ? 'text-blue-300' : 'text-gray-400'}`}>
                      {dragMessage}
                    </p>
                    <p className="text-xs text-gray-500">
                      JSON files only
                    </p>
                  </div>
                </div>
                <form onSubmit={editingApiKey ? handleEditApiKey : handleAddApiKey} className="space-y-4">
                  {/* API Key Name */}
                  <div>
                    <label htmlFor="apiKeyName" className="block text-sm font-medium text-gray-300">
                      Name
                    </label>
                    <input
                      id="apiKeyName"
                      type="text"
                      value={apiKeyName}
                      onChange={(e) => setApiKeyName(e.target.value)}
                      className="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter API key name"
                      required
                    />
                  </div>

                  {/* API Key Value */}
                  <div>
                    <label htmlFor="apiKeyValue" className="block text-sm font-medium text-gray-300">
                      API Key
                    </label>
                    <input
                      id="apiKeyValue"
                      type="text"
                      value={apiKeyValue}
                      onChange={(e) => setApiKeyValue(e.target.value)}
                      className="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter API key value"
                      required
                    />
                  </div>

                  {/* API Key Service */}
                  <div>
                    <label htmlFor="apiKeyService" className="block text-sm font-medium text-gray-300">
                      Service
                    </label>
                    <input
                      id="apiKeyService"
                      type="text"
                      value={apiKeyService}
                      onChange={(e) => setApiKeyService(e.target.value)}
                      className="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter service name (e.g., Google Maps, OpenAI)"
                      required
                    />
                  </div>

                  {/* API Key URL */}
                  <div>
                    <label htmlFor="apiKeyUrl" className="block text-sm font-medium text-gray-300">
                      URL
                    </label>
                    <input
                      id="apiKeyUrl"
                      type="text"
                      value={apiKeyUrl}
                      onChange={(e) => setApiKeyUrl(e.target.value)}
                      className="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter API endpoint URL"
                    />
                  </div>

                  {/* API Key Valid Before */}
                  <div>
                    <label htmlFor="apiKeyValidBefore" className="block text-sm font-medium text-gray-300">
                      Valid Before
                    </label>
                    <input
                      id="apiKeyValidBefore"
                      type="text"
                      value={apiKeyValidBefore}
                      onChange={(e) => setApiKeyValidBefore(e.target.value)}
                      className="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white focus:border-blue-500 focus:ring-blue-500"
                      placeholder="YYYY-MM-DDTHH:MM:SSZ"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Format: YYYY-MM-DDTHH:MM:SSZ (e.g., 2026-04-04T20:37:00Z)
                      <br />
                      You can paste an ISO date string directly or enter it manually.
                    </p>
                  </div>

                  {/* API Key Tenant ID */}
                  <div>
                    <label htmlFor="apiKeyTenantId" className="block text-sm font-medium text-gray-300">
                      Tenant ID <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="apiKeyTenantId"
                      type="text"
                      value={apiKeyTenantId}
                      onChange={(e) => setApiKeyTenantId(e.target.value)}
                      className="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter tenant identifier"
                      required
                    />
                  </div>

                  {/* Error Message */}
                  {apiKeyError && <ErrorDisplay message={apiKeyError} />}

                  {/* Form Buttons */}
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={isAddingApiKey || isEditingApiKey}
                      className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAddingApiKey || isEditingApiKey ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelApiKeyForm}
                      className="flex-1 py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* API Keys List */}
            {apiKeys.length > 0 ? (
              <div className="overflow-x-auto relative">
                <table className="min-w-full divide-y divide-gray-700 table-fixed">
                  <thead className="bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-1/3">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-1/3">
                        API Token
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-1/3">
                        Service
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider w-[120px] bg-gray-700 sticky right-0">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {apiKeys.map((apiKey) => (
                      <tr key={apiKey.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 truncate max-w-[150px]">
                          {apiKey.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          <div className="flex items-center">
                            <span className="font-mono bg-gray-700 px-2 py-1 rounded">
                              {apiKey.key.substring(0, 4)}...{apiKey.key.substring(apiKey.key.length - 4)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 truncate max-w-[150px]">
                          {apiKey.service}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium w-[120px] bg-gray-800 sticky right-0">
                          <button
                            onClick={() => startEditApiKey(apiKey)}
                            className="text-blue-400 hover:text-blue-300 mr-4"
                            disabled={!!editingApiKey || showAddApiKey}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteApiKey(apiKey.id)}
                            className="text-red-400 hover:text-red-300"
                            disabled={!!editingApiKey || showAddApiKey}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No API keys added yet. Click "Add API Key" to add one.
              </div>
            )}
          </div>
        </div>
      </PageLayout>
    );
  };

  return <ProtectedRoute message="Loading user profile...">{renderProfileContent()}</ProtectedRoute>;
}
