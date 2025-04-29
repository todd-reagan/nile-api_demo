'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { PageLayout, ErrorDisplay } from '../components/ui';

export default function SignupPage() {
  const router = useRouter();
  const { signUp, confirmRegistration } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignupComplete, setIsSignupComplete] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await signUp(email, password, { email, name });
      setIsSignupComplete(true);
    } catch (err) {
      console.error('Signup error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred during signup');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode) {
      setVerificationError('Please enter the verification code');
      return;
    }
    
    setIsVerifying(true);
    setVerificationError(null);
    
    try {
      await confirmRegistration(email, verificationCode);
      router.push('/login'); // Redirect to login page after successful verification
    } catch (err) {
      console.error('Verification error:', err);
      if (err instanceof Error) {
        setVerificationError(err.message);
      } else {
        setVerificationError('An unexpected error occurred during verification');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <PageLayout title={isSignupComplete ? "Verify Your Account" : "Sign Up"}>
      <div className="max-w-md mx-auto bg-gray-800 rounded-lg p-8 shadow-lg">
        {!isSignupComplete ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter your email"
                required
              />
            </div>

            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                Name (optional)
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

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter your password"
                required
              />
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
                placeholder="Confirm your password"
                required
              />
            </div>

            {/* Error Message */}
            {error && <ErrorDisplay message={error} />}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing up...' : 'Sign Up'}
              </button>
            </div>

            {/* Login Link */}
            <div className="text-center text-sm text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-500 hover:text-blue-400">
                Log in
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerification} className="space-y-6">
            <p className="text-gray-300 mb-4">
              We've sent a verification code to your email. Please enter it below to verify your account.
            </p>
            
            {/* Verification Code Field */}
            <div>
              <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-300">
                Verification Code
              </label>
              <input
                id="verificationCode"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter verification code"
                required
              />
            </div>

            {/* Error Message */}
            {verificationError && <ErrorDisplay message={verificationError} />}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isVerifying}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? 'Verifying...' : 'Verify Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </PageLayout>
  );
}
