import { makeGenericAPIRouteHandler } from '@keystatic/core/api/generic';
import { keystaticConfig } from '@/keystatic.config';

export const dynamic = 'force-dynamic';

const handler = makeGenericAPIRouteHandler(keystaticConfig, {
  slug: 'keystatic',
});

export const GET = (req: Request) => {
  return handler(req);
};

export const POST = (req: Request) => {
  return handler(req);
};
