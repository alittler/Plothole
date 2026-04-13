import { NextRequest } from 'next/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const AUTH0_ISSUER = 'https://dev-t0pa1ah6r1n2wc4a.us.auth0.com/';
const AUTH0_AUDIENCE = 'https://dev-t0pa1ah6r1n2wc4a.us.auth0.com/api/v2/';

const JWKS = createRemoteJWKSet(new URL(`${AUTH0_ISSUER}.well-known/jwks.json`));

export async function getUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: AUTH0_ISSUER,
      audience: AUTH0_AUDIENCE,
    });

    return payload.sub || null;
  } catch (error) {
    console.error('[Auth] JWT verification failed:', error);
    return null;
  }
}
