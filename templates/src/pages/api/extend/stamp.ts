import { buildStamp } from '@/generated/buildStamp';
export const prerender = false;
export const GET = () =>
  new Response(JSON.stringify(buildStamp), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
