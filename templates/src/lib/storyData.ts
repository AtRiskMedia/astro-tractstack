import type { AstroGlobal } from 'astro';
import { handleFailedResponse } from '@/utils/backend';

export interface StoryData {
  id: string;
  title: string;
  slug: string;
  paneIds: string[];
  codeHookTargets: Record<string, string>;
  fragments: Record<string, string>;
  menu: any;
  isHome: boolean;
  created: string;
}

export async function getStoryData(
  astro: AstroGlobal,
  lookup: string,
  sessionId: string,
  tenantId: string
): Promise<StoryData> {
  const goBackend = import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
  const endpoint = lookup
    ? `${goBackend}/api/v1/nodes/storyfragments/slug/${lookup}/personalized-payload`
    : `${goBackend}/api/v1/nodes/storyfragments/home/personalized-payload`;

  const response = await fetch(endpoint, {
    headers: {
      'X-Tenant-ID': tenantId,
      'X-TractStack-Session-ID': sessionId,
    },
  });

  const failedResponse = await handleFailedResponse(
    response,
    goBackend,
    tenantId,
    astro.url.pathname
  );
  if (failedResponse) {
    throw new Response(null, {
      status: failedResponse.status,
      statusText: failedResponse.statusText,
    });
  }

  const storyData = await response.json();

  if (storyData.isHome && lookup !== '') {
    throw astro.redirect('/');
  }

  return storyData;
}
