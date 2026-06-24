import { getCachedFullContentMap, getFullContentMap } from '@/stores/analytics';
import { getCodeHookResources } from '@/lib/resources';
import type { ResourceNode } from '@/types/compositorTypes';

export interface CodeHookBladeContext {
  tenantId: string;
  paneId: string;
  optionsStr: string;
  options?: { params: { options: string } };
}

export interface CodeHookResourceFilters {
  categories: string[];
  slugs: string[];
}

export function parseCodeHookBladeContext(
  searchParams: URLSearchParams
): CodeHookBladeContext {
  const tenantId = searchParams.get('tenantId') || 'default';
  const paneId = searchParams.get('paneId') || '';
  const optionsStr = searchParams.get('options') || '';
  const options = optionsStr ? { params: { options: optionsStr } } : undefined;
  return { tenantId, paneId, optionsStr, options };
}

export async function resolveCodeHookFullContentMap(
  tenantId: string
): Promise<any[]> {
  let fullContentMap = getCachedFullContentMap(tenantId);
  if (!fullContentMap.length) {
    fullContentMap = await getFullContentMap(tenantId);
  }
  return fullContentMap;
}

export function parseCodeHookResourceFilters(
  optionsStr: string,
  logLabel?: string
): CodeHookResourceFilters {
  const categories: string[] = [];
  const slugs: string[] = [];
  if (!optionsStr) {
    return { categories, slugs };
  }
  try {
    const parsed = JSON.parse(optionsStr);
    if (typeof parsed.category === 'string' && parsed.category) {
      categories.push(...parsed.category.split('|'));
    }
    if (typeof parsed.slugs === 'string' && parsed.slugs) {
      slugs.push(...parsed.slugs.split(','));
    }
    if (typeof parsed.slug === 'string' && parsed.slug) {
      slugs.push(parsed.slug);
    }
  } catch (e) {
    console.error(`Invalid options for ${logLabel ?? 'codehook resources'}`, e);
  }
  return { categories, slugs };
}

export async function resolveCodeHookResources(
  tenantId: string,
  optionsStr: string,
  logLabel?: string
): Promise<ResourceNode[]> {
  const { categories, slugs } = parseCodeHookResourceFilters(
    optionsStr,
    logLabel
  );
  return getCodeHookResources(tenantId, categories, slugs);
}

export function buildCodeHookBladePath(
  hookId: string,
  ctx: Pick<CodeHookBladeContext, 'paneId' | 'tenantId' | 'optionsStr'>
): string {
  const params = new URLSearchParams({
    paneId: ctx.paneId,
    tenantId: ctx.tenantId,
  });
  if (ctx.optionsStr) {
    params.set('options', ctx.optionsStr);
  }
  return `/codehooks/${hookId}?${params.toString()}`;
}

export function resolveSSRFetchOrigin(pageUrl: URL, siteUrl?: string): string {
  if (siteUrl) {
    try {
      return new URL(siteUrl).origin;
    } catch {
      // fall through to page origin
    }
  }
  return pageUrl.origin;
}

export async function fetchCodeHookBladeHtml(
  bladePath: string,
  request: Request,
  origin: string
): Promise<string> {
  try {
    const url = new URL(bladePath, origin);
    const res = await fetch(url, {
      headers: {
        cookie: request.headers.get('cookie') ?? '',
        accept: 'text/html',
      },
    });
    if (!res.ok) {
      console.error(
        `Failed to SSR-fetch codehook blade ${bladePath}. Status: ${res.status}`
      );
      return '';
    }
    return res.text();
  } catch (error) {
    console.error(`Error SSR-fetching codehook blade ${bladePath}:`, error);
    return '';
  }
}

export async function fetchCodeHookBladesForPanes(options: {
  paneIds: string[];
  codeHookTargets: Record<string, string>;
  tenantId: string;
  request: Request;
  origin: string;
}): Promise<Record<string, string>> {
  const { paneIds, codeHookTargets, tenantId, request, origin } = options;
  const result: Record<string, string> = {};

  await Promise.all(
    paneIds
      .filter((paneId) => codeHookTargets[paneId])
      .map(async (paneId) => {
        const hookId = codeHookTargets[paneId];
        const optionsStr = codeHookTargets[`${paneId}-${hookId}`] || '';
        const bladePath = buildCodeHookBladePath(hookId, {
          paneId,
          tenantId,
          optionsStr,
        });
        result[paneId] = await fetchCodeHookBladeHtml(
          bladePath,
          request,
          origin
        );
      })
  );

  return result;
}
