'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr'; // Import useSWR
import { useForm } from '../hooks'; // Keep useForm, remove useFetch if no longer needed elsewhere
import { fetchSegments, authorizeDevice, DeviceAuthorizationParams } from '../services/api';
import { Segment } from '../types';
import { DEVICE_STATUS_OPTIONS } from '../constants';
import { PageLayout, LoadingState, ErrorDisplay, DataItem, ReturnToDevices } from '../components/ui';

function MacAuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const deviceId = searchParams.get('deviceId');
  const macAddress = searchParams.get('macAddress');

  // Use SWR to fetch segments - provides caching and revalidation
  // The key '/api/segments' uniquely identifies this data fetch.
  const { 
    data: segments, 
    error: segmentsSwrError, // Corrected variable name for SWR error object
    isLoading: segmentsLoading // SWR uses isLoading instead of loading
  } = useSWR<Segment[]>('/api/segments', fetchSegments); 

  // Convert potential SWR error object to a string message for consistency with ErrorDisplay
  const segmentsError = segmentsSwrError ? (segmentsSwrError instanceof Error ? segmentsSwrError.message : String(segmentsSwrError)) : null; // Corrected variable name
  
  const { values, errors, isSubmitting, handleChange, setFieldValue, setFieldError, handleSubmit } = useForm<{
    status: string;
    segment: string;
    description: string;
  }>({
    status: 'Status',
    segment: 'Select Segment',
    description: ''
  });

  const submitForm = async () => {
    if (!deviceId || !macAddress) {
      setFieldError('form', 'Missing device information');
      return;
    }

    if (values.status === 'Status') {
      setFieldError('status', 'Please select a status');
      return;
    }

    if (values.segment === 'Select Segment') {
      setFieldError('segment', 'Please select a segment');
      return;
    }

    try {
      await authorizeDevice({
        deviceId,
        macAddress,
        segmentId: values.segment,
        status: values.status,
        description: values.description
      });

      // Redirect back to devices page on success, passing success flag and MAC address
      router.push(`/devices?authSuccess=true&mac=${encodeURIComponent(macAddress || '')}`);
    } catch (err) {
      console.error('Error submitting form:', err);
      setFieldError('form', err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  if (!deviceId || !macAddress) {
    return (
      <PageLayout 
        title="Device Authorization"
        returnComponent={<ReturnToDevices />}
      >
        <div className="text-center text-red-500">Missing device information</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      title="Device Authorization"
      returnComponent={<ReturnToDevices />}
    >
      <div className="max-w-2xl mx-auto bg-gray-800 rounded-lg p-6">
        <div className="space-y-6">
          {/* Device Information */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">Device Information</h2>
            <div className="text-gray-300">
              <DataItem label="Device ID" value={deviceId} />
              <DataItem label="MAC Address" value={macAddress} />
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="space-y-2">
            <label htmlFor="status" className="block text-sm font-medium text-gray-300">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={values.status}
              onChange={handleChange}
              className="block w-full rounded-md bg-gray-700 border-gray-500 text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {DEVICE_STATUS_OPTIONS.map(option => (
                <option 
                  key={option.value} 
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))}
            </select>
            {errors.status && (
              <p className="text-red-500 text-sm mt-1">{errors.status}</p>
            )}
          </div>

          {/* Segment Dropdown */}
          <div className="space-y-2">
            <label htmlFor="segment" className="block text-sm font-medium text-gray-300">
              Segment
            </label>
            <select
              id="segment"
              name="segment"
              value={values.segment}
              onChange={handleChange}
              className="block w-full rounded-md bg-gray-700 border-gray-500 text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={segmentsLoading}
            >
              <option value="Select Segment" disabled>Select Segment</option> {/* Keep disabled placeholder */}
              {segments?.map((segment) => (
                // Use segment.id as the value, but display segment.segment (name)
                // Ensure segment.id is available and non-empty
                segment.id ? (
                  <option key={segment.id} value={segment.id}>
                    {segment.segment} {/* Display name */}
                  </option>
                ) : null // Or handle segments without IDs differently if needed
              ))}
            </select>
            {segmentsLoading && (
              <p className="text-sm text-gray-400">Loading segments...</p>
            )}
            {errors.segment && (
              <p className="text-red-500 text-sm mt-1">{errors.segment}</p>
            )}
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-300">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={values.description}
              onChange={handleChange}
              className="block w-full rounded-md bg-gray-700 border-gray-500 text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Enter description..."
            />
          </div>

          {/* Error Message */}
          {(errors.form || segmentsError) && (
            <ErrorDisplay message={errors.form || segmentsError || ''} />
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSubmit(submitForm)}
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default function MacAuthPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading..." />}>
      <MacAuthContent />
    </Suspense>
  );
}
