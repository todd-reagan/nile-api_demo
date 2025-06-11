'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CognitoUser } from 'amazon-cognito-identity-js';
import { userPool } from '../services/auth';
import PageLayout from '../components/ui/PageLayout';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!userPool) {
      setError('Cognito User Pool is not initialized');
      return;
    }

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.forgotPassword({
      onSuccess: () => {
        setSuccess(true);
        router.push(`/reset-password?email=${encodeURIComponent(email)}`);
      },
      onFailure: (err) => {
        setError(err.message);
      },
    });
  };

  return (
    <PageLayout title="Forgot Password">
      <div className="max-w-md mx-auto bg-gray-800 rounded-lg p-8 shadow-lg">
        <form onSubmit={handleForgotPassword} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter your email"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send Reset Code
          </button>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && (
            <p className="text-green-500 text-sm">
              A confirmation code has been sent to your email.
            </p>
          )}
        </form>
      </div>
    </PageLayout>
  );
};

export default ForgotPassword;
