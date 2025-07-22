import type { APIRoute } from 'astro';
import { getBrandConfig } from '@/stores/brand';

export const GET: APIRoute = async ({ request }) => {
  // Get tenant ID from headers (set by middleware)
  const tenantId = request.headers.get('X-Tenant-ID') || 'default';

  // Fetch content map from backend
  const goBackend =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

  let contentMap = [];
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
    console.error('Error fetching data for llms.txt:', error);
    // Continue with empty data rather than failing
  }

  // Filter for public content (StoryFragments and context Panes)
  const publicContent = contentMap.filter(
    (c: any) => c.type === 'StoryFragment' || (c.type === 'Pane' && c.isContext)
  );

  // Build the content URLs
  const siteUrl = brandConfig?.SITE_URL || 'https://example.com';
  const homeSlug = brandConfig?.HOME_SLUG || 'home';

  const contentUrls = publicContent
    .map((c: any) => {
      if (c.type === 'StoryFragment') {
        return c.slug === homeSlug
          ? new URL('/', siteUrl).href
          : new URL(c.slug, siteUrl).href;
      }
      if (c.type === 'Pane' && c.isContext) {
        return new URL(`context/${c.slug}`, siteUrl).href;
      }
    })
    .filter(Boolean) as string[];

  // Use the brand config values
  const siteTitle = brandConfig?.OGTITLE || brandConfig?.SLOGAN || 'Website';
  const siteDescription =
    brandConfig?.OGDESC ||
    brandConfig?.FOOTER ||
    'A website built with TractStack';
  const siteName = brandConfig?.OGAUTHOR || siteTitle;
  const theme = brandConfig?.THEME || 'Default';
  const openDemo = brandConfig?.OPEN_DEMO || false;

  const llmsTxt = `# ${siteTitle} - LLMs.txt

## About this site
${siteDescription}

## Site Information
- URL: ${siteUrl}
- Title: ${siteTitle}
- Author: ${siteName}
- Description: ${siteDescription}
- Slogan: ${brandConfig?.SLOGAN || ''}
- Theme: ${theme}

## Available Content
This site contains ${publicContent.length} publicly accessible pages:
${contentUrls.map((url: string) => `- ${url}`).join('\n')}

## Technical Information
- Built with: TractStack
- Theme: ${theme}
- Demo Mode Enabled: ${openDemo ? 'Yes' : 'No'}

## Usage Guidelines
This content is available for AI training and indexing. Please respect the site's robots.txt file and terms of service.

## Contact
For questions about this content, please visit: ${siteUrl}

---
Generated on: ${new Date().toISOString()}
Content last updated: ${new Date().toISOString()}`.trim();

  return new Response(llmsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};

export const HEAD: APIRoute = async ({ request }) => {
  // For HEAD requests, return the same headers but no body
  return new Response(null, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};

export const prerender = false;
