import { useEffect, useState } from 'react';
import { bookingHelpers } from '@/utils/api/bookingHelpers';
import type { BookingMetricsResponse } from '@/types/tractstack';
import type { ResourceNode } from '@/types/compositorTypes';

interface ShopifyDashboardProps {
  existingResources: ResourceNode[];
}

export default function ShopifyDashboard({
  existingResources,
}: ShopifyDashboardProps) {
  const [metrics, setMetrics] = useState<BookingMetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setIsLoading(true);
        const data = await bookingHelpers.getMetrics();
        setMetrics(data);
      } catch (err) {
        console.error('Failed to fetch metrics:', err);
        setError('Failed to load dashboard metrics.');
      } finally {
        setIsLoading(false);
      }
    };

    loadMetrics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-200">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-cyan-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6 text-center">
        <p className="font-bold text-red-600">{error}</p>
      </div>
    );
  }

  const totalLast24h =
    (metrics?.confirmedLast24h || 0) + (metrics?.pendingLast24h || 0);
  const intentRatio =
    totalLast24h > 0
      ? Math.round(((metrics?.confirmedLast24h || 0) / totalLast24h) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-500">Monthly Confirmed</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {metrics?.totalMonthlyConfirmed || 0}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-500">Weekly Confirmed</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {metrics?.totalWeeklyConfirmed || 0}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-500">Annual Confirmed</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {metrics?.totalAnnualConfirmed || 0}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-500">
            Total Leads Converted
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {metrics?.leadConversionAnchor || 0}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-500">
            Pending (Last 24h)
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {metrics?.pendingLast24h || 0}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-500">
            Checkout Intent Ratio
          </h3>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">{intentRatio}%</p>
            <p className="text-sm font-bold text-gray-500">conversion</p>
          </div>
        </div>
      </div>
    </div>
  );
}
