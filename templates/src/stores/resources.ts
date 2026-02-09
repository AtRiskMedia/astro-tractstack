import { map } from 'nanostores';
import type { ResourceNode } from '@/types/compositorTypes';

export const HEADER_RESOURCES_TTL = 5 * 60 * 1000;

export const headerResourcesStore = map<{
  data: ResourceNode[];
  lastFetched: number;
  key?: string;
}>({
  data: [],
  lastFetched: 0,
  key: '',
});
