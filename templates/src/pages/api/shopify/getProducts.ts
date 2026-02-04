import type { APIRoute } from '@/types/astro';
import { shopifyData } from '@/stores/shopify';

export const prerender = false;

const CACHE_TTL = 5 * 60 * 1000;

export const GET: APIRoute = async () => {
  const token = import.meta.env.PRIVATE_SHOPIFY_STOREFRONT_TOKEN;
  const domain = import.meta.env.PRIVATE_SHOPIFY_DOMAIN;

  if (!token || !domain) {
    return new Response(
      JSON.stringify({ error: 'Server configuration missing' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const currentStore = shopifyData.get();
  const now = Date.now();

  if (
    currentStore.products.length > 0 &&
    currentStore.lastFetched &&
    now - currentStore.lastFetched < CACHE_TTL
  ) {
    return new Response(JSON.stringify(currentStore), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cleanDomain = domain.endsWith('/') ? domain.slice(0, -1) : domain;
  let allProducts: any[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  try {
    while (hasNextPage) {
      const query = `
        query ($cursor: String) {
          products(first: 250, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                id
                title
                handle
                description
                options {
                  name
                  values
                }
                images(first: 20) {
                  edges {
                    node {
                      url
                      altText
                    }
                  }
                }
                variants(first: 250) {
                  edges {
                    node {
                      id
                      title
                      price {
                        amount
                        currencyCode
                      }
                      compareAtPrice {
                        amount
                        currencyCode
                      }
                      sku
                      availableForSale
                      requiresShipping
                      selectedOptions {
                        name
                        value
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response: Response = await fetch(
        `${cleanDomain}/api/2024-01/graphql.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': token,
          },
          body: JSON.stringify({
            query,
            variables: { cursor },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Shopify API Error: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      const { products } = result.data;

      const mappedProducts = products.edges.map(({ node }: any) => ({
        id: node.id,
        title: node.title,
        handle: node.handle,
        description: node.description,
        options: node.options,
        images: node.images.edges.map((edge: any) => edge.node),
        variants: node.variants.edges.map((edge: any) => edge.node),
      }));

      allProducts = [...allProducts, ...mappedProducts];

      hasNextPage = products.pageInfo.hasNextPage;
      cursor = products.pageInfo.endCursor;
    }

    const newState = {
      products: allProducts,
      lastFetched: now,
    };

    shopifyData.set(newState);

    return new Response(JSON.stringify(newState), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Shopify proxy fetch failed:', error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : 'Failed to fetch products',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
