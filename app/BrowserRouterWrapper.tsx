'use client';

import { ReactNode, useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';

const clearInvalidTokens = () => {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheKey = `@@auth0spajs@@::${process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dev-t0pa1ah6r1n2wc4a.us.auth0.com'}::${process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || 'Q7IpCDbQGniIiqT7V2qmHXFf2ZBiEvSe'}::`;
    
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(cacheKey)) {
        const cached = JSON.parse(localStorage.getItem(key) || '{}');
        if (cached.refresh_token) {
          delete cached.refresh_token;
          localStorage.setItem(key, JSON.stringify(cached));
        }
      }
    });
  } catch (err) {
    console.error('[Auth0] Failed to clear invalid tokens:', err);
  }
};

export function BrowserRouterWrapper({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    clearInvalidTokens();
  }, []);

  if (!isMounted) {
    return null;
  }

  // Get the redirect URI - use the current origin for client-side redirects
  const getRedirectUri = () => {
    if (typeof window === 'undefined') return 'http://localhost:3000';
    return window.location.origin;
  };

  const handleAuth0Error = (error: any) => {
    console.error('[Auth0] Auth error:', error);
  };

  return (
    <Auth0Provider
      domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dev-t0pa1ah6r1n2wc4a.us.auth0.com'}
      clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || 'Q7IpCDbQGniIiqT7V2qmHXFf2ZBiEvSe'}
      authorizationParams={{
        redirect_uri: getRedirectUri(),
        audience: 'https://dev-t0pa1ah6r1n2wc4a.us.auth0.com/api/v2/',
        scope: 'openid profile email offline_access',
        response_mode: 'query',
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
      onError={handleAuth0Error}
      onRedirectCallback={(appState) => {
        if (typeof window !== 'undefined') {
          const cleanPath = appState?.returnTo || '/';
          window.history.replaceState({}, document.title, cleanPath);
        }
      }}
    >
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Auth0Provider>
  );
}
