import type { APIRoute } from '@/types/astro';
import { getBrandConfig } from '@/stores/brand';

// Helper functions for date formatting
function dateToUnixTimestamp(dateString: string): number {
  return new Date(dateString).getTime();
}

function formatDateToYYYYMMDD(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

export const GET: APIRoute = async ({ request }) => {
  // Get tenant ID from headers (set by middleware)
  const tenantId = request.headers.get('X-Tenant-ID') || 'default';

  // Fetch content map and brand config
  const goBackend =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

  let contentMap: any[] = [];
  let brandConfig = null;

  try {
    // Fetch content map
    const contentResponse = await fetch(
      `${goBackend}/api/v1/content/full-map`,
      {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      }
    );

    if (contentResponse.ok) {
      const contentData = await contentResponse.json();
      contentMap = contentData.data?.data || [];
    }

    // Fetch brand config
    brandConfig = await getBrandConfig(tenantId);
  } catch (error) {
    console.error('Error fetching data for sitemap:', error);
    // Continue with empty data rather than failing
  }

  const siteUrl = brandConfig?.SITE_URL || 'https://example.com';
  const homeSlug = brandConfig?.HOME_SLUG || 'home';

  const xmlTop = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
  const xmlBottom = `</urlset>`;

  const entries = contentMap
    .map((c: any) => {
      if (c.type === 'StoryFragment') {
        const thisPriority = c.slug === homeSlug ? '1.0' : '0.8';
        const thisUrl =
          c.slug === homeSlug
            ? new URL('/', siteUrl).href
            : new URL(c.slug, siteUrl).href;
        const thisChanged = (c?.changed && dateToUnixTimestamp(c.changed)) || 0;
        const thisCreated = dateToUnixTimestamp(c.created);
        const daysDelta = (thisChanged - thisCreated) / (1000 * 60 * 60 * 24);
        const formatted = formatDateToYYYYMMDD(c.changed || c.created);
        const thisFreq =
          daysDelta < 3
            ? 'daily'
            : daysDelta < 10
              ? 'weekly'
              : daysDelta < 90
                ? 'monthly'
                : 'yearly';
        return `<url><loc>${thisUrl}</loc><lastmod>${formatted}</lastmod><changefreq>${thisFreq}</changefreq><priority>${thisPriority}</priority></url>`;
      }
      if (c.type === 'Pane' && c.isContext) {
        const thisUrl = new URL(`context/${c.slug}`, siteUrl).href;
        const thisChanged = (c?.changed && dateToUnixTimestamp(c.changed)) || 0;
        const thisCreated = dateToUnixTimestamp(c.created);
        const daysDelta = (thisChanged - thisCreated) / (1000 * 60 * 60 * 24);
        const formatted = formatDateToYYYYMMDD(c.changed || c.created);
        const thisFreq =
          daysDelta < 3
            ? 'daily'
            : daysDelta < 10
              ? 'weekly'
              : daysDelta < 90
                ? 'monthly'
                : 'yearly';
        return `<url><loc>${thisUrl}</loc><lastmod>${formatted}</lastmod><changefreq>${thisFreq}</changefreq><priority>0.4</priority></url>`;
      }
    })
    .filter((n) => n);

  const xmlBody = entries.join('');
  const xml = `${xmlTop}${xmlBody}${xmlBottom}`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};

export const HEAD: APIRoute = async () => {
  // For HEAD requests, return the same headers but no body
  return new Response(null, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};

export const prerender = false;
