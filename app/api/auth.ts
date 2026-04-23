import { NextRequest } from 'next/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const AUTH0_ISSUER = 'https://dev-t0pa1ah6r1n2wc4a.us.auth0.com/';
const AUTH0_AUDIENCE = 'https://dev-t0pa1ah6r1n2wc4a.us.auth0.com/api/v2/';

const JWKS = createRemoteJWKSet(new URL(`${AUTH0_ISSUER}.well-known/jwks.json`));

export interface AuthPayload {
  userId: string;
  email: string;
}

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

export async function getAuthPayload(request: NextRequest): Promise<AuthPayload | null> {
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

    const userId = payload.sub;
    const email = (payload.email as string) || `${userId}@auth.internal`;

    if (!userId) return null;

    return { userId, email };
  } catch (error) {
    console.error('[Auth] JWT verification failed:', error);
    return null;
  }
}
