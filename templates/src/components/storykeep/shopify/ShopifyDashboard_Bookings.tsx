import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ChangeEvent,
} from 'react';
import { Toggle } from '@ark-ui/react/toggle';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import TableCellsIcon from '@heroicons/react/24/outline/TableCellsIcon';
import XCircleIcon from '@heroicons/react/24/outline/XCircleIcon';
import { bookingHelpers } from '@/utils/api/bookingHelpers';
import type { BookingEntity } from '@/types/tractstack';
import type { ResourceNode } from '@/types/compositorTypes';

interface ShopifyDashboardBookingsProps {
  existingResources: ResourceNode[];
}

const ITEMS_PER_PAGE = 10;

export default function ShopifyDashboard_Bookings({
  existingResources,
}: ShopifyDashboardBookingsProps) {
  const [isCalendarView, setIsCalendarView] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [shopTimezone, setShopTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  const [bookings, setBookings] = useState<BookingEntity[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCanceling, setIsCanceling] = useState<string | null>(null);

  const resourceMap = useMemo(() => {
    return new Map(existingResources.map((r) => [r.id, r.title]));
  }, [existingResources]);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const limit = isCalendarView ? 100 : ITEMS_PER_PAGE;
      const offset = isCalendarView ? 0 : currentPage * ITEMS_PER_PAGE;
      const response = await bookingHelpers.listBookings(
        limit,
        offset,
        statusFilter
      );
      setBookings(response.data || []);
      setTotalCount(response.totalCount || 0);

      const availability = await bookingHelpers.getAvailability(
        new Date().toISOString(),
        new Date().toISOString()
      );
      if (availability?.scheduling?.timezone) {
        setShopTimezone(availability.scheduling.timezone);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, isCalendarView]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleStatusChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(0);
  };

  const handleCancelBooking = async (traceId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    setIsCanceling(traceId);
    try {
      await bookingHelpers.cancelBooking(traceId);
      await fetchBookings();
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      alert('Failed to cancel booking. Please try again.');
    } finally {
      setIsCanceling(null);
    }
  };

  const dayBookings = useMemo(() => {
    return bookings.filter((b) => {
      const bDate = new Date(b.startTime);
      return bDate.toLocaleDateString() === selectedDate.toLocaleDateString();
    });
  }, [bookings, selectedDate]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

  const renderCustomerInfo = (booking: BookingEntity) => {
    if (booking.leadName && booking.leadEmail) {
      return `${booking.leadName} (${booking.leadEmail})`;
    }
    return 'Guest';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className="rounded-md border border-gray-300 py-1.5 pl-3 pr-8 text-sm text-gray-700 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <span className="text-sm text-gray-500">
            {totalCount} total bookings
          </span>
        </div>

        <div className="flex items-center gap-2 border-l border-gray-300 pl-6">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            View:
          </span>
          <Toggle.Root
            pressed={isCalendarView}
            onPressedChange={setIsCalendarView}
            className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-bold shadow-sm transition-all ${
              isCalendarView
                ? 'border-cyan-600 bg-cyan-600 text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {isCalendarView ? (
              <>
                <CalendarIcon className="h-4 w-4" />
                Calendar
              </>
            ) : (
              <>
                <TableCellsIcon className="h-4 w-4" />
                Table
              </>
            )}
          </Toggle.Root>
        </div>
      </div>

      {isCalendarView ? (
        <div className="flex flex-col space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <label className="block text-sm font-bold text-gray-700">
                Select Date
              </label>
              <input
                type="date"
                defaultValue={todayStr}
                onChange={(e) => {
                  const [y, m, d] = e.target.value.split('-');
                  setSelectedDate(
                    new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
                  );
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
              />
              <div className="rounded-md border border-cyan-100 bg-cyan-50 p-4">
                <p className="text-xs text-cyan-800">
                  Showing loaded bookings in <strong>{shopTimezone}</strong>{' '}
                  time.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-gray-700">
                Bookings for {selectedDate.toLocaleDateString()}
              </label>
              <div className="grid max-h-96 grid-cols-1 gap-3 overflow-y-auto pr-2">
                {isLoading ? (
                  <div className="flex h-32 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-cyan-600" />
                  </div>
                ) : dayBookings.length > 0 ? (
                  dayBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-cyan-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${getStatusColor(booking.status)}`}
                          >
                            {booking.status}
                          </span>
                          <div className="text-sm font-bold text-gray-900">
                            {new Date(booking.startTime).toLocaleTimeString(
                              'en-US',
                              {
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: shopTimezone,
                              }
                            )}
                            {' - '}
                            {new Date(booking.endTime).toLocaleTimeString(
                              'en-US',
                              {
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: shopTimezone,
                              }
                            )}
                          </div>
                        </div>
                        {booking.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            disabled={isCanceling === booking.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            <XCircleIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-gray-500">
                        <div className="flex items-center justify-between text-gray-900">
                          <span>{renderCustomerInfo(booking)}</span>
                          {booking.shopifyOrderId && (
                            <a
                              href={`https://admin.shopify.com/orders/${booking.shopifyOrderId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-600 hover:text-cyan-800 hover:underline"
                            >
                              Order #{booking.shopifyOrderId}
                            </a>
                          )}
                        </div>
                        <div className="text-gray-700">
                          {booking.resourceIds
                            .map(
                              (id) => resourceMap.get(id) || 'Unknown Service'
                            )
                            .join(', ')}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-32 flex-col items-center justify-center rounded-md border border-dashed border-gray-200 text-gray-400">
                    <CalendarIcon className="mb-1 h-6 w-6" />
                    <p className="text-xs">No bookings found for this date.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    Service(s)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-cyan-600" />
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      No bookings found.
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${getStatusColor(
                            booking.status
                          )}`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {booking.resourceIds
                          .map((id) => resourceMap.get(id) || 'Unknown Service')
                          .join(', ')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div>{renderCustomerInfo(booking)}</div>
                        {booking.shopifyOrderId && (
                          <a
                            href={`https://admin.shopify.com/orders/${booking.shopifyOrderId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-xs font-bold text-cyan-600 hover:text-cyan-800 hover:underline"
                          >
                            Order #{booking.shopifyOrderId}
                          </a>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        <div>
                          {new Date(booking.startTime).toLocaleDateString()}
                        </div>
                        <div className="text-gray-500">
                          {new Date(booking.startTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          -{' '}
                          {new Date(booking.endTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold">
                        {booking.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            disabled={isCanceling === booking.id}
                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            {isCanceling === booking.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-200 border-t-red-600" />
                            ) : (
                              <XCircleIcon className="h-5 w-5" />
                            )}
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0 || isLoading}
                className="rounded border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="flex items-center text-sm text-gray-600">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages - 1 || isLoading}
                className="rounded border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
