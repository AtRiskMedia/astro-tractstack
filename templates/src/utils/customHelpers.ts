import type { ResourceNode } from '@/types/compositorTypes';
import type { CartItemState } from '@/stores/shopify';

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
export const resourceFormHideFields = ['gid', 'shopifyImage'];

// Field Formatting Controls for ResourceForm
// Fields listed here will be treated as JSON objects but rendered as stringified text areas
export const resourceJsonifyFields = ['shopifyData', 'shopifyImage'];

export const RESTRICTION_MESSAGES = {
  BOOKING: (duration: number) =>
    `This is a ${duration} minute service. On checkout we'll help you book at your convenience.`,
  TERMS: 'Please review the terms for this item before adding it to your cart.',
  MAX_DURATION: (max: number) =>
    `You cannot book more than ${max} minutes of services in one session.`,
  DEFAULT_ADD: (title: string) => `${title} has been added to your cart.`,
};

// For CartModal.tsx
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

export const MAX_LENGTH_MINUTES = 180;

export const BOOKING_LINK_INCREMENTS = [30, 60, 90, 120, 150, 180];

export const BOOKING_LINKS: Record<number, string> = {
  30: '30min',
  60: '60min',
  90: '90min',
  120: '120min',
  150: '150min',
  180: '180min',
};

export function getBookingBucket(minutes: number): string | null {
  if (minutes <= 0) return null;
  if (minutes > MAX_LENGTH_MINUTES) return null;

  const bucket = BOOKING_LINK_INCREMENTS.find((inc) => minutes <= inc);
  return bucket ? BOOKING_LINKS[bucket] : null;
}

export function calculateCartDuration(
  cart: Record<string, CartItemState>,
  resources: ResourceNode[]
): number {
  return Object.values(cart).reduce((total, item) => {
    const resource = resources.find((r) => r.id === item.resourceId);
    const duration = Number(
      resource?.optionsPayload?.bookingLengthMinutes || 0
    );
    return total + (isNaN(duration) ? 0 : duration * item.quantity);
  }, 0);
}
