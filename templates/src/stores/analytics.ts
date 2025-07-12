import { atom } from 'nanostores';

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
