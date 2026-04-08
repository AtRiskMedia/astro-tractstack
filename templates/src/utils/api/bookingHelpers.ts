import { customerDetails } from '@/stores/shopify';

export const bookingHelpers = {
  /**
   * Checks if a user profile already exists for a given email via the BFF.
   */
  lookupLead: async (email: string) => {
    const response = await fetch('/api/auth/lookup-lead', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    return await response.json();
  },

  /**
   * Asks backend for availability slots
   */
  getAvailability: async (start: string, end: string) => {
    const query = new URLSearchParams({
      start,
      end,
    });
    const response = await fetch(
      `/api/booking/availability?${query.toString()}`
    );
    return await response.json();
  },

  /**
   * Places a temporary hold on a specific slot for the manifest of services and pickup products.
   */
  holdSlot: async (
    traceId: string,
    startTime: string,
    endTime: string,
    resourceIds: string[]
  ) => {
    const details = customerDetails.get();

    const response = await fetch('/api/booking/hold', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        traceId,
        leadId: details.leadId,
        resourceIds,
        startTime,
        endTime,
      }),
    });
    return await response.json();
  },

  /**
   * Releases a temporary hold, typically used when a user abandons checkout.
   */
  releaseHold: async (traceId: string) => {
    const response = await fetch('/api/booking/release', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ traceId }),
    });
    return await response.json();
  },

  /**
   * Confirms a pending hold, finalizing the booking for free services.
   */
  confirmBooking: async (traceId: string) => {
    const response = await fetch('/api/booking/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ traceId }),
    });
    return await response.json();
  },

  /**
   * Retrieves a paginated list of all bookings for the administrative dashboard.
   */
  listBookings: async (
    limit: number = 50,
    offset: number = 0,
    status: string = 'ALL'
  ) => {
    const query = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      status,
    });
    const response = await fetch(`/api/booking/list?${query.toString()}`);
    return await response.json();
  },

  /**
   * Retrieves aggregated booking volume and conversion statistics.
   */
  getMetrics: async () => {
    const response = await fetch('/api/booking/metrics');
    return await response.json();
  },

  /**
   * Manually cancels an existing booking from the administrative dashboard.
   */
  cancelBooking: async (traceId: string) => {
    const response = await fetch('/api/booking/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ traceId }),
    });
    return await response.json();
  },
};
