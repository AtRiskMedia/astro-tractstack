import type { APIRoute } from '@/types/astro';
import { getBrandConfig } from '@/stores/brand';

export const GET: APIRoute = async ({ request }) => {
  // Get tenant ID from headers (set by middleware)
  const tenantId = request.headers.get('X-Tenant-ID') || 'default';

  // Fetch brand config
  let brandConfig = null;

  try {
    brandConfig = await getBrandConfig(tenantId);
  } catch (error) {
    console.error('Error fetching brand config for robots.txt:', error);
    // Continue with default values
  }

  const siteUrl = brandConfig?.SITE_URL || 'https://example.com';

  const robotsTxt = `
User-agent: *
Disallow: /storykeep/
Disallow: /storykeep/*
Allow: /

Sitemap: ${new URL('sitemap.xml', siteUrl).href}
`.trim();

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};

export const prerender = false;
