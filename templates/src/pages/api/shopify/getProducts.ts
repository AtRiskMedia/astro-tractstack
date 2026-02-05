import type { APIRoute } from '@/types/astro';
import { shopifyData } from '@/stores/shopify';

export const prerender = false;

const CACHE_TTL = 15 * 60 * 1000;

const getBackendUrl = () => {
  return import.meta.env.PUBLIC_API_URL || 'http://localhost:8080';
};

export const GET: APIRoute = async ({ request, cookies }) => {
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
          products(first: 250, after: $cursor, query: "product_type:'active'") {
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
        variants: node.variants.edges.map(({ node }: any) => ({
          id: node.id,
          title: node.title,
          price: node.price,
          compareAtPrice: node.compareAtPrice,
          sku: node.sku,
          availableForSale: node.availableForSale,
          requiresShipping: node.requiresShipping,
          selectedOptions: node.selectedOptions,
        })),
      }));

      allProducts = [...allProducts, ...mappedProducts];

      hasNextPage = products.pageInfo.hasNextPage;
      cursor = products.pageInfo.endCursor;
    }

    try {
      const resourcesToSync = allProducts.map((p) => {
        return {
          title: p.title,
          nodeType: 'Resource',
          slug: `product-${p.handle}`.toLowerCase(),
          categorySlug: 'product',
          oneliner: p.description ? p.description.substring(0, 255) : '',
          actionLisp: '',
          optionsPayload: {
            gid: p.id,
            shopifyData: JSON.stringify(p),
          },
        };
      });

      let authHeader = request.headers.get('Authorization');

      if (!authHeader) {
        const adminCookie = cookies.get('admin_auth');
        const editorCookie = cookies.get('editor_auth');

        if (adminCookie?.value) {
          authHeader = `Bearer ${adminCookie.value}`;
        } else if (editorCookie?.value) {
          authHeader = `Bearer ${editorCookie.value}`;
        }
      }

      if (authHeader && resourcesToSync.length > 0) {
        const syncUrl = `${getBackendUrl()}/api/v1/nodes/resources/sync/shopify`;
        const startTime = Date.now();

        const syncResponse = await fetch(syncUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
            'X-Tenant-ID': 'default',
          },
          body: JSON.stringify(resourcesToSync),
        });

        const duration = Date.now() - startTime;

        if (syncResponse.ok) {
          const syncResult = await syncResponse.json();
          const { totalIncoming, totalExisting, updated } = syncResult.stats;
          console.log(
            `[Shopify Sync] Time: ${duration}ms, Total Shopify: ${totalIncoming}, Total Resources: ${totalExisting}, Updates: ${updated}`
          );
        } else {
          const errText = await syncResponse.text();
          console.error(
            `[Shopify Sync] Backend rejected sync: ${syncResponse.status} - ${errText}`
          );
        }
      } else {
        console.warn(
          '[Shopify Sync] Skipped: No Authorization header/cookie or no products to sync'
        );
      }
    } catch (syncErr) {
      console.error('[Shopify Sync] Error during backend sync:', syncErr);
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
