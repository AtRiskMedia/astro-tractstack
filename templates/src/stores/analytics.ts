import { atom } from 'nanostores';

export const epinetCustomFilters = atom<{
  enabled: boolean;
  visitorType: 'all' | 'anonymous' | 'known';
  selectedUserId: string | null;
  startHour: number | null;
  endHour: number | null;
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
  startHour: null,
  endHour: null,
  userCounts: [],
  hourlyNodeActivity: {},
});
