'use client';

import Link from 'next/link';
import { useFetch } from '../hooks';
import { fetchSegments } from '../services/api';
import { Segment } from '../types';
import { PageLayout, LoadingState, ErrorState, Card, DataItem } from '../components/ui';

export default function SegmentsPage() {
  const { data: segments, loading, error } = useFetch<Segment[]>(fetchSegments);

  if (loading) {
    return <LoadingState message="Loading segments..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!segments || segments.length === 0) {
    return <ErrorState title="No Data" message="No segments available" />;
  }

  // Group segments by tenant ID
  const segmentsByTenant: Record<string, Segment[]> = {};
  segments.forEach(segment => {
    if (!segmentsByTenant[segment.tenantid]) {
      segmentsByTenant[segment.tenantid] = [];
    }
    segmentsByTenant[segment.tenantid].push(segment);
  });

  return (
    <PageLayout title="Network Segments">
      <div className="space-y-8">
        {Object.entries(segmentsByTenant).map(([tenantId, tenantSegments]) => (
          <div key={tenantId} className="bg-gray-800 rounded-lg shadow-md p-6">
            {/* Tenant Information */}
            <h2 className="text-2xl font-semibold mb-4">
              Tenant: {tenantId}
            </h2>

            {/* Segments */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium mb-2">Segments</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {tenantSegments.map((segment) => (
                  <Link
                    key={segment.segment}
                    href={`/segments.html?id=${segment.segment}`}
                    className="bg-gray-700 rounded p-4 hover:bg-gray-600 transition-colors duration-200"
                  >
                    <p className="font-medium text-lg">{segment.segment}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
