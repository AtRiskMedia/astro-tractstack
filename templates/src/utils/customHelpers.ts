import type { ResourceNode } from '@/types/compositorTypes';

// URL Helper: Strip category prefix from slug
// e.g., "people-bleako" -> "bleako"
export function getCleanSlug(categorySlug: string, fullSlug: string): string {
  const prefix = `${categorySlug}-`;
  return fullSlug.startsWith(prefix) ? fullSlug.slice(prefix.length) : fullSlug;
}

// Build proper URL for resource
// e.g., category="people", slug="people-bleako" -> "/people/bleako"
export function getResourceUrl(categorySlug: string, fullSlug: string): string {
  const cleanSlug = getCleanSlug(categorySlug, fullSlug);
  return `/${categorySlug}/${cleanSlug}`;
}

// Image Helper: Placeholder implementation
export function getResourceImage(
  id: string,
  slug: string,
  category: string
): string {
  console.log(`please define getResourceImage`, id, slug, category);
  return '/static.jpg';
}

export function getResourceDescription(
  id: string,
  slug: string,
  category: string
): string | null {
  console.log(`please define getResourceDescription`, id, slug, category);
  return null;
}

// Initialize search data - override in custom implementation
export function initSearch(): void {
  // Default implementation does nothing
  // Override this function in your custom implementation to load search data
}

// Field Visibility Controls for ResourceForm
export const resourceFormHideFields = [
  'gid',
  'serviceBound',
  'shopifyImageSourceUrl',
];

// Field Formatting Controls for ResourceForm
// Fields listed here will be treated as JSON objects but rendered as stringified text areas
export const resourceJsonifyFields = ['shopifyData'];

// --- Commerce Helpers ---

export const RESTRICTION_MESSAGES = {
  BOOKING: (duration: string) =>
    `This is a ${duration} minute service. On checkout we'll help you book at your convenience.`,
  TERMS: 'Please review the terms for this item before adding it to your cart.',
};

export function checkRestrictions(resource: ResourceNode): boolean {
  // 1. Service / Booking Requirement
  // We check for the explicit option payload value used by services
  if (resource.optionsPayload?.bookingLengthMinutes) {
    return true;
  }

  // 2. Final Sale / Terms Check
  // Placeholder: In the future, check for flags like resource.optionsPayload?.finalSale
  // if (resource.optionsPayload?.finalSale) {
  //   return true;
  // }

  return false;
}
