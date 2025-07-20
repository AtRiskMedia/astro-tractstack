import { atom } from 'nanostores';
import { TractStackAPI } from '@/utils/api';

export const epinetCustomFilters = atom<{
  enabled: boolean;
  visitorType: 'all' | 'anonymous' | 'known';
  selectedUserId: string | null;
  // UTC timestamp fields only
  startTimeUTC: string | null;
  endTimeUTC: string | null;
  userCounts: Array<{ id: string; count: number; isKnown: boolean }>;
  hourlyNodeActivity: Record<
    string,
    Record<
      string,
      {
        events: Record<string, number>;
        visitorIds: string[];
      }
    >
  >;
}>({
  enabled: false,
  visitorType: 'all',
  selectedUserId: null,
  startTimeUTC: null,
  endTimeUTC: null,
  userCounts: [],
  hourlyNodeActivity: {},
});

export const fullContentMapStore = atom<{
  data: any[];
  lastUpdated: number;
} | null>(null);

export async function getFullContentMap(tenantId: string): Promise<any[]> {
  const api = new TractStackAPI(tenantId);
  const cached = fullContentMapStore.get();

  try {
    const response = await api.getContentMapWithTimestamp(cached?.lastUpdated);

    if (response.success && response.data) {
      // response.data will be {data: [...], lastUpdated: 123}
      fullContentMapStore.set({
        data: response.data.data,
        lastUpdated: response.data.lastUpdated,
      });
      return response.data.data;
    } else {
      const errorMsg = response.error || '';
      if (errorMsg.includes('304')) {
        return cached?.data || [];
      }
    }
  } catch (error) {
    console.error('Failed to fetch content map:', error);
  }
  return cached?.data || [];
}
