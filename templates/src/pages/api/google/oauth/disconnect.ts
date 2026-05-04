import type { APIRoute } from '@/types/astro';

export const POST: APIRoute = async ({ request, locals, url }) => {
  const GO_BACKEND =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
  const tenantId =
    locals.tenant?.id || import.meta.env.PUBLIC_TENANTID || 'default';
  const forwardedProto =
    request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
  const forwardedHost = request.headers.get('x-forwarded-host') || url.host;

  const response = await fetch(`${GO_BACKEND}/api/v1/google/oauth/disconnect`, {
    method: 'POST',
    headers: {
      'X-Tenant-ID': tenantId,
      'X-Forwarded-Proto': forwardedProto,
      'X-Forwarded-Host': forwardedHost,
      ...(request.headers.get('Authorization') && {
        Authorization: request.headers.get('Authorization')!,
      }),
      ...(request.headers.get('Cookie') && {
        Cookie: request.headers.get('Cookie')!,
      }),
    },
  });

  const data = await response.text();
  return new Response(data, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
