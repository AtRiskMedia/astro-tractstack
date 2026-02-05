import { atom, map } from 'nanostores';

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

export const shopifyData = atom<{
  products: ShopifyProduct[];
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

function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'admin_auth' || name === 'editor_auth') {
      return value;
    }
  }
  return null;
}

export async function fetchShopifyProducts() {
  shopifyStatus.set({ isLoading: true, error: null });

  try {
    const token = getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/shopify/getProducts', {
      headers,
    });

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
