'use client';

import { useState, useEffect } from 'react';

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook for data fetching with loading and error states
 * @param fetchFn - The function to fetch data
 * @param dependencies - Dependencies array for useEffect
 * @returns Object containing data, loading state, and error state
 */
export function useFetch<T>(
  fetchFn: () => Promise<T>,
  dependencies: any[] = []
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip API call during static export
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await fetchFn();
        setData(result);
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            console.log('Fetch aborted');
            return;
          }
          setError(err.message);
        } else {
          setError('An unexpected error occurred');
        }
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { data, loading, error };
}
