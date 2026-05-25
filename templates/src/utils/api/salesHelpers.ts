export const salesHelpers = {
  /**
   * Retrieves a paginated list of paid Shopify sales for the administrative dashboard.
   */
  listSales: async (limit: number = 50, offset: number = 0) => {
    const query = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    const response = await fetch(`/api/sales/list?${query.toString()}`);
    return await response.json();
  },

  /**
   * Retrieves paid Shopify sales metrics for the administrative dashboard.
   */
  getMetrics: async () => {
    const response = await fetch('/api/sales/metrics');
    return await response.json();
  },
};
