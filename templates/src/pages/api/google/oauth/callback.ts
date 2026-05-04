import type { APIRoute } from '@/types/astro';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const GO_BACKEND =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
  const tenantId =
    locals.tenant?.id || import.meta.env.PUBLIC_TENANTID || 'default';

  const forwardedProto =
    request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
  const forwardedHost = request.headers.get('x-forwarded-host') || url.host;

  const response = await fetch(
    `${GO_BACKEND}/api/v1/google/oauth/callback${url.search}`,
    {
      method: 'GET',
      redirect: 'manual',
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
    }
  );

  const location = response.headers.get('location');
  if (location) {
    const frontendOrigin = `${forwardedProto}://${forwardedHost}`;
    const redirectUrl = new URL(location, frontendOrigin).toString();
    return Response.redirect(
      redirectUrl,
      response.status >= 300 && response.status < 400 ? response.status : 302
    );
  }

  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: {
      'Content-Type':
        response.headers.get('Content-Type') || 'application/json',
    },
  });
};
