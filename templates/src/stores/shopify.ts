import { atom, map, onMount } from 'nanostores';
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

export const modalState = atom<{
  isOpen: boolean;
  type: 'success' | 'restriction';
  title: string;
  message: string;
}>({
  isOpen: false,
  type: 'success',
  title: '',
  message: '',
});

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

export interface ShopifyPageInfo {
  hasNextPage: boolean;
  endCursor: string;
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
  suppressModal?: boolean;
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

export const isShopifyHandoff = atom<boolean>(false);

export const shopifyData = atom<{
  products: ShopifyProduct[];
  pageInfo?: ShopifyPageInfo;
  lastFetched: number;
}>({
  products: [],
  lastFetched: 0,
});

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
  cartStore.set(cartPersistence.get());

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

let currentAbortController: AbortController | null = null;

export async function fetchShopifyProducts(
  q: string = '',
  cursor: string | null = null
) {
  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();
  const signal = currentAbortController.signal;

  shopifyStatus.set({ isLoading: true, error: null });

  try {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (cursor) params.set('cursor', cursor);

    const queryString = params.toString();
    const url = `/api/shopify/getProducts${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, { signal });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch products');
    }

    shopifyData.set({
      products: result.products || [],
      pageInfo: result.pageInfo,
      lastFetched: Date.now(),
    });

    shopifyStatus.set({ isLoading: false, error: null });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return;
    }

    console.error('Shopify fetch failed:', error);
    shopifyStatus.set({
      isLoading: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch products',
    });
  }
}

export function clearShopifySearch() {
  if (currentAbortController) {
    currentAbortController.abort();
  }
  shopifyData.set({
    products: [],
    pageInfo: undefined,
    lastFetched: 0,
  });
  shopifyStatus.set({ isLoading: false, error: null });
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
