import { map, onMount } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';

export interface ShopifyVariant {
  id: string;
  title: string;
  price: {
    amount: string;
    currencyCode: string;
  };
  compareAtPrice?: {
    amount: string;
    currencyCode: string;
  };
  sku?: string;
  availableForSale: boolean;
  requiresShipping: boolean;
  selectedOptions: {
    name: string;
    value: string;
  }[];
}

export interface ShopifyOption {
  name: string;
  values: string[];
}

export interface ShopifyImage {
  url: string;
  altText?: string;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  options: ShopifyOption[];
  images: ShopifyImage[];
  variants: ShopifyVariant[];
}

export type CartActionType = 'add' | 'remove';

export interface CartAction {
  resourceId: string;
  gid?: string;
  variantId?: string;
  variantIdShipped?: string;
  variantIdPickup?: string;
  boundResourceId?: string;
  action: CartActionType;
}

export interface CartItemState {
  resourceId: string;
  quantity: number;
  variantId?: string;
  gid?: string;
  variantIdShipped?: string;
  variantIdPickup?: string;
  boundResourceId?: string;
}

export const QUEUE_STATES = {
  READY: 'READY',
  ADDING: 'ADDING',
  HAS_REQUIREMENTS: 'HAS_REQUIREMENTS',
} as const;

export type QueueState = (typeof QUEUE_STATES)[keyof typeof QUEUE_STATES];

export const CART_STATES = {
  INIT: 'INIT',
  READY: 'READY',
  LOADED: 'LOADED',
  CHECKOUT: 'CHECKOUT',
  BOOKING: 'BOOKING',
  BOOKED: 'BOOKED',
  SHOPIFY_HANDOFF: 'SHOPIFY_HANDOFF',
} as const;

export type CartState = (typeof CART_STATES)[keyof typeof CART_STATES];

// Persistent Data Stores
export const shopifyData = persistentAtom<{
  products: ShopifyProduct[];
  lastFetched: number;
}>(
  'tractstack_shopify_data',
  {
    products: [],
    lastFetched: 0,
  },
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  }
);

// Non-persistent Status (Load states should reset on refresh)
export const shopifyStatus = map<{
  isLoading: boolean;
  error: string | null;
}>({
  isLoading: false,
  error: null,
});

export const addQueue = persistentAtom<CartAction[]>(
  'tractstack_shopify_queue',
  [],
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  }
);

// We use a backing persistentAtom for the cart to ensure data survives reloads,
// but expose it as a 'map' to preserve the .setKey() API used by consumers.
const cartPersistence = persistentAtom<Record<string, CartItemState>>(
  'tractstack_shopify_cart',
  {},
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  }
);

export const cartStore = map<Record<string, CartItemState>>(
  cartPersistence.get()
);

onMount(cartStore, () => {
  // Sync initial state from persistence (in case of race conditions or hydration delay)
  cartStore.set(cartPersistence.get());

  // Persist any changes made to the map
  const unbind = cartStore.listen((value) => {
    cartPersistence.set(value);
  });

  return () => unbind();
});

export const queueState = persistentAtom<QueueState>(
  'tractstack_shopify_queue_state',
  QUEUE_STATES.READY
);
export const cartState = persistentAtom<CartState>(
  'tractstack_shopify_cart_state',
  CART_STATES.INIT
);

export async function fetchShopifyProducts() {
  shopifyStatus.set({ isLoading: true, error: null });

  try {
    const response = await fetch('/api/shopify/getProducts');
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch products');
    }

    shopifyData.set({
      products: result.products,
      lastFetched: Date.now(),
    });

    shopifyStatus.set({ isLoading: false, error: null });
  } catch (error) {
    console.error('Shopify fetch failed:', error);
    shopifyStatus.set({
      isLoading: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch products',
    });
  }
}

export const customerDetails = persistentAtom<{
  name: string;
  email: string;
}>(
  'tractstack_shopify_customer',
  {
    name: '',
    email: '',
  },
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  }
);
