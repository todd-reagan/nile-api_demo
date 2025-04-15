'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

interface Segment {
  segment: string;
  tenantid: string;
}

function MacAuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const deviceId = searchParams.get('deviceId');
  const macAddress = searchParams.get('macAddress');

  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('Status');
  const [selectedSegment, setSelectedSegment] = useState('Select Segment');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    const fetchSegments = async () => {
      try {
        const segmentsResponse = await fetch('https://ofthddzjjh.execute-api.us-west-2.amazonaws.com/prod/segments');
        if (!segmentsResponse.ok) {
          throw new Error('Failed to fetch segments');
        }
        const segmentsData = await segmentsResponse.json();
        if (Array.isArray(segmentsData)) {
          setSegments(segmentsData);
        } else {
          throw new Error('Invalid segments data format');
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching segments:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSegments();
  }, []);

  const handleSubmit = async () => {
    if (!deviceId || !macAddress || selectedSegment === 'Select Segment' || selectedStatus === 'Status') {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitLoading(true);
    setError(null);

    try {
      const response = await fetch('https://r734rgw5dju6ibxoyx47totfgm0mtxeu.lambda-url.us-west-2.on.aws/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId,
          macAddress,
          segmentId: selectedSegment,
          status: selectedStatus,
          description
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update device');
      }

      // Redirect back to devices page on success
      router.push('/devices');
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!deviceId || !macAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-red-500">Missing device information</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Device Authorization</h1>
          <Link 
            href="/devices" 
            className="text-gray-300 hover:text-white transition-colors duration-200"
          >
            Return to Devices
          </Link>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="space-y-6">
            {/* Device Information */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">Device Information</h2>
              <div className="text-gray-300">
                <p><span className="font-medium">Device ID:</span> {deviceId}</p>
                <p><span className="font-medium">MAC Address:</span> {macAddress}</p>
              </div>
            </div>

            {/* Status Dropdown */}
            <div className="space-y-2">
              <label htmlFor="status" className="block text-sm font-medium text-gray-300">
                Status
              </label>
              <select
                id="status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="Status">Status</option>
                <option value="Approved">Approved</option>
                <option value="Denied">Denied</option>
              </select>
            </div>

            {/* Segment Dropdown */}
            <div className="space-y-2">
              <label htmlFor="segment" className="block text-sm font-medium text-gray-300">
                Segment
              </label>
              <select
                id="segment"
                value={selectedSegment}
                onChange={(e) => setSelectedSegment(e.target.value)}
                className="block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="Select Segment">Select Segment</option>
                {segments.map((segment) => (
                  <option key={segment.segment} value={segment.segment}>
                    {segment.segment}
                  </option>
                ))}
              </select>
              {loading && (
                <p className="text-sm text-gray-400">Loading segments...</p>
              )}
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-300">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
                rows={3}
                placeholder="Enter description..."
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-500 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={submitLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitLoading ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MacAuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-gray-400">Loading...</div>
        </div>
      </div>
    }>
      <MacAuthContent />
    </Suspense>
  );
} 