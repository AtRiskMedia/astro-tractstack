import { getCartItemKey as baseGetCartItemKey } from '@/stores/shopify';
import type { CartItemState, CartKeyParams } from '@/stores/shopify';
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
export const resourceFormHideFields = ['gid', 'shopifyImage'];

// Field Formatting Controls for ResourceForm
// Fields listed here will be treated as JSON objects but rendered as stringified text areas
export const resourceJsonifyFields = ['shopifyData', 'shopifyImage'];

const SERVICES_ATTR_LIMIT = 255;

type CheckoutLineAttribute = { key: string; value: string };

export type ShopifyCheckoutLine = {
  merchandiseId: string;
  quantity: number;
  attributes?: CheckoutLineAttribute[];
};

export type DepositSummary = {
  title: string;
  amount: string;
  currencyCode: string;
  variantId: string;
};

export type SharedFeeChargeLineSummary = DepositSummary & {
  servicesCount: number;
  description?: string;
};

export const RESTRICTION_MESSAGES = {
  BOOKING: (duration: number) =>
    `This is a ${duration} minute service. On checkout we'll help you book at your convenience.`,
  TERMS: 'Please review the terms for this item before adding it to your cart.',
  MAX_DURATION: (max: number) =>
    `You cannot book more than ${max} minutes of services in one session.`,
  INCOMPATIBLE_REMOTE:
    'This service cannot be combined with the services already in your cart. Some require remote-only delivery while others can only be delivered in person.',
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

export function getProductByGid(
  resources: ResourceNode[],
  gid?: string
): ResourceNode | undefined {
  if (!gid) return undefined;
  return resources.find(
    (r) => r.categorySlug === 'product' && r.optionsPayload?.gid === gid
  );
}

export function getServiceLinkedProduct(
  service: ResourceNode,
  resources: ResourceNode[]
): ResourceNode | undefined {
  const gid =
    typeof service.optionsPayload?.gid === 'string'
      ? service.optionsPayload.gid
      : undefined;
  return getProductByGid(resources, gid);
}

export function parsePrimaryShopifyProductData(
  resource?: ResourceNode
): any | null {
  if (!resource?.optionsPayload?.shopifyData) {
    return null;
  }
  try {
    const parsed = JSON.parse(resource.optionsPayload.shopifyData);
    return parsed.products?.[0] || parsed;
  } catch {
    return null;
  }
}

function extractVariantForResource(resource?: ResourceNode): any | null {
  const parsed = parsePrimaryShopifyProductData(resource);
  if (!parsed) return null;
  const variants = parsed.variants || [];
  return variants[0] || null;
}

export function parseDepositFromProductResource(
  product?: ResourceNode
): DepositSummary | null {
  if (!product) return null;
  const parsed = parsePrimaryShopifyProductData(product);
  const variant = extractVariantForResource(product);
  const variantId = variant?.id;
  if (!variantId) return null;
  return {
    title: parsed?.title || product.title,
    amount: variant?.price?.amount || '0.00',
    currencyCode: variant?.price?.currencyCode || 'USD',
    variantId,
  };
}

export function isSharedFeeService(
  service: ResourceNode | undefined,
  resources: ResourceNode[]
): boolean {
  if (!service || service.categorySlug !== 'service') return false;
  const product = getServiceLinkedProduct(service, resources);
  return product?.optionsPayload?.sharedServiceFee === true;
}

export function getServiceDisplayTitle(
  service: ResourceNode | undefined,
  resources: ResourceNode[]
): string {
  if (!service) return 'Service';
  const product = getServiceLinkedProduct(service, resources);
  const parsed = parsePrimaryShopifyProductData(product);
  return parsed?.title || service.title;
}

export function getServiceVariantIdFromCanonicalProduct(
  service: ResourceNode | undefined,
  resources: ResourceNode[]
): string | undefined {
  if (!service || service.categorySlug !== 'service') {
    return undefined;
  }
  const product = getServiceLinkedProduct(service, resources);
  const variant = extractVariantForResource(product);
  return typeof variant?.id === 'string' ? variant.id : undefined;
}

export function getCartItemKey(
  params: CartKeyParams,
  resource?: ResourceNode,
  resources: ResourceNode[] = []
): string {
  if (resource && isSharedFeeService(resource, resources)) {
    return params.resourceId;
  }
  return baseGetCartItemKey(params);
}

export function collectServiceGids(services: ResourceNode[]): Set<string> {
  const gids = new Set<string>();
  services.forEach((service) => {
    if (typeof service.optionsPayload?.gid === 'string') {
      gids.add(service.optionsPayload.gid);
    }
  });
  return gids;
}

function formatServicesAttribute(
  services: ResourceNode[]
): CheckoutLineAttribute {
  const titles = services.map((s) => s.title);
  const joined = titles.join(', ');
  if (joined.length <= SERVICES_ATTR_LIMIT) {
    return { key: 'Services', value: joined };
  }
  return { key: 'Services', value: `${services.length} services` };
}

export function getDepositLineSummary(
  cart: Record<string, CartItemState>,
  resources: ResourceNode[]
): DepositSummary | null {
  const chargeLine = getSharedFeeChargeLineSummary(cart, resources);
  if (!chargeLine) {
    return null;
  }
  return {
    title: chargeLine.title,
    amount: chargeLine.amount,
    currencyCode: chargeLine.currencyCode,
    variantId: chargeLine.variantId,
  };
}

export function getSharedFeeChargeLineSummary(
  cart: Record<string, CartItemState>,
  resources: ResourceNode[]
): SharedFeeChargeLineSummary | null {
  const serviceIds = new Set(
    Object.values(cart).map((item) => item.resourceId)
  );
  const sharedServices = resources.filter(
    (r) => serviceIds.has(r.id) && isSharedFeeService(r, resources)
  );
  if (sharedServices.length === 0) {
    return null;
  }
  const canonicalProduct = getServiceLinkedProduct(
    sharedServices[0],
    resources
  );
  const deposit = parseDepositFromProductResource(canonicalProduct);
  const canonicalProductData = parsePrimaryShopifyProductData(canonicalProduct);
  const description =
    typeof canonicalProductData?.description === 'string' &&
    canonicalProductData.description.trim().length > 0
      ? canonicalProductData.description
      : undefined;
  if (!deposit) {
    return null;
  }
  return {
    ...deposit,
    servicesCount: sharedServices.length,
    description,
  };
}

export function buildShopifyCheckoutLines(
  cart: Record<string, CartItemState>,
  resources: ResourceNode[]
): ShopifyCheckoutLine[] {
  const lines: ShopifyCheckoutLine[] = [];
  const cartItems = Object.values(cart);
  const sharedFeeServices: ResourceNode[] = [];
  const sharedFeeServiceIds = new Set<string>();

  cartItems.forEach((item) => {
    const resource = resources.find((r) => r.id === item.resourceId);
    if (isSharedFeeService(resource, resources) && resource) {
      sharedFeeServices.push(resource);
      sharedFeeServiceIds.add(resource.id);
    }
  });

  if (sharedFeeServices.length > 0) {
    const canonicalProduct = getServiceLinkedProduct(
      sharedFeeServices[0],
      resources
    );
    const deposit = parseDepositFromProductResource(canonicalProduct);
    if (deposit?.variantId) {
      lines.push({
        merchandiseId: deposit.variantId,
        quantity: 1,
        attributes: [formatServicesAttribute(sharedFeeServices)],
      });
    }
  }

  cartItems.forEach((item) => {
    const resource = resources.find((r) => r.id === item.resourceId);
    if (!resource) return;
    if (sharedFeeServiceIds.has(resource.id)) return;
    const nonSharedServiceVariant =
      resource.categorySlug === 'service'
        ? getServiceVariantIdFromCanonicalProduct(resource, resources)
        : undefined;
    const merchandiseId = item.variantId || nonSharedServiceVariant;
    if (!merchandiseId) return;
    lines.push({
      merchandiseId,
      quantity: item.quantity || 1,
    });
  });

  return lines;
}

export function hasGidBackedCheckout(
  cart: Record<string, CartItemState>,
  resources: ResourceNode[]
): boolean {
  const cartItems = Object.values(cart);
  return cartItems.some((item) => {
    const resource = resources.find((r) => r.id === item.resourceId);
    if (!resource) return false;
    return (
      typeof resource.optionsPayload?.gid === 'string' &&
      !!resource.optionsPayload.gid
    );
  });
}

export function getCartIconCount(
  cart: Record<string, CartItemState>,
  resources: ResourceNode[]
): number {
  const cartValues = Object.values(cart);
  const boundServiceIds = new Set(
    cartValues.map((item) => item.boundResourceId).filter(Boolean)
  );
  let sharedFeeAdded = false;

  return cartValues
    .filter((item) => !boundServiceIds.has(item.resourceId))
    .reduce((total, item) => {
      const resource = resources.find((r) => r.id === item.resourceId);
      if (isSharedFeeService(resource, resources)) {
        if (sharedFeeAdded) return total;
        sharedFeeAdded = true;
        return total + 1;
      }
      return total + item.quantity;
    }, 0);
}
