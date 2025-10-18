import { atom } from 'nanostores';
import type { ResourceNode } from '@/types/compositorTypes';

export interface ResourcesCache {
  data: ResourceNode[];
  lastFetched: number;
}

// Initialize with an empty state. This atom will live on the server and persist
// across page requests for the lifetime of the server instance.
export const headerResourcesStore = atom<ResourcesCache>({
  data: [],
  lastFetched: 0,
});

// Default Time-To-Live for the cache: 5 minutes in milliseconds.
export const HEADER_RESOURCES_TTL = 5 * 60 * 1000;
