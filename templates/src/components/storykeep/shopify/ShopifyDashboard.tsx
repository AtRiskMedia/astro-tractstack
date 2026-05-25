import { useEffect, useState } from 'react';
import { bookingHelpers } from '@/utils/api/bookingHelpers';
import { salesHelpers } from '@/utils/api/salesHelpers';
import type {
  BookingMetricsResponse,
  SaleMetricsResponse,
} from '@/types/tractstack';

export default function ShopifyDashboard({}) {
  const [bookingMetrics, setBookingMetrics] =
    useState<BookingMetricsResponse | null>(null);
  const [salesMetrics, setSalesMetrics] = useState<SaleMetricsResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setIsLoading(true);
        const [bookingData, salesData] = await Promise.all([
          bookingHelpers.getMetrics(),
          salesHelpers.getMetrics(),
        ]);
        setBookingMetrics(bookingData);
        setSalesMetrics(salesData);
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
    (bookingMetrics?.confirmedLast24h || 0) +
    (bookingMetrics?.pendingLast24h || 0);
  const intentRatio =
    totalLast24h > 0
      ? Math.round(
          ((bookingMetrics?.confirmedLast24h || 0) / totalLast24h) * 100
        )
      : 0;
  const currencyCode = salesMetrics?.currencyCode || 'USD';
  const formatMoney = (amount: string | undefined) => {
    const parsed = parseFloat(amount || '0');
    const safeAmount = Number.isFinite(parsed) ? parsed : 0;
    return `${safeAmount.toFixed(2)} ${currencyCode}`;
  };

  const MetricCard = ({
    title,
    value,
    subtext,
    alert = false,
  }: {
    title: string;
    value: string | number;
    subtext?: string;
    alert?: boolean;
  }) => (
    <div
      className={`rounded-lg border p-6 shadow-sm ${
        alert ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
      }`}
    >
      <h3
        className={`text-sm font-bold ${
          alert ? 'text-red-700' : 'text-gray-500'
        }`}
      >
        {title}
      </h3>
      <p
        className={`mt-2 text-3xl font-bold ${
          alert ? 'text-red-900' : 'text-gray-900'
        }`}
      >
        {value}
      </p>
      {subtext && (
        <p
          className={`mt-1 text-sm font-bold ${
            alert ? 'text-red-600' : 'text-gray-500'
          }`}
        >
          {subtext}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Sales Performance</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            title="Paid Order Total (Month)"
            value={formatMoney(salesMetrics?.paidOrderTotalMonth)}
            subtext={`Year: ${formatMoney(
              salesMetrics?.paidOrderTotalYear
            )} · All time: ${formatMoney(salesMetrics?.paidOrderTotalAllTime)}`}
          />
          <MetricCard
            title="Paid Orders (Month)"
            value={salesMetrics?.paidOrdersMonth || 0}
            subtext={`Year: ${salesMetrics?.paidOrdersYear || 0} · All time: ${
              salesMetrics?.paidOrdersAllTime || 0
            }`}
          />
          <MetricCard
            title="Average Paid Order"
            value={formatMoney(salesMetrics?.averagePaidOrderMonth)}
          />
          <MetricCard
            title="Local Pickup Line Total"
            value={formatMoney(salesMetrics?.localPickupLineTotalMonth)}
          />
          <MetricCard
            title="Unique Paying Customers"
            value={salesMetrics?.uniquePayingCustomers || 0}
          />
          <MetricCard
            title="Orphan Payments"
            value={salesMetrics?.orphanOrdersMonth || 0}
            alert={(salesMetrics?.orphanOrdersMonth || 0) > 0}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Sales Mix</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard
            title="Appointment Sales"
            value={salesMetrics?.appointmentOrdersMonth || 0}
          />
          <MetricCard
            title="Product-only Sales"
            value={salesMetrics?.productOnlyOrdersMonth || 0}
          />
          <MetricCard
            title="Local Pickup Orders"
            value={salesMetrics?.localPickupOrdersMonth || 0}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Booking Funnel</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-500">
              Monthly Confirmed
            </h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {bookingMetrics?.totalMonthlyConfirmed || 0}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-500">
              Weekly Confirmed
            </h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {bookingMetrics?.totalWeeklyConfirmed || 0}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-500">
              Annual Confirmed
            </h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {bookingMetrics?.totalAnnualConfirmed || 0}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-500">
              Total Leads Converted
            </h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {bookingMetrics?.leadConversionAnchor || 0}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-500">
              Pending (Last 24h)
            </h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {bookingMetrics?.pendingLast24h || 0}
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
      </section>
    </div>
  );
}
