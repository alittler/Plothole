'use client';

import { ReactNode, useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';

export function BrowserRouterWrapper({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  // Get the redirect URI - use the current origin for client-side redirects
  const getRedirectUri = () => {
    if (typeof window === 'undefined') return 'http://localhost:3000';
    return window.location.origin;
  };

  return (
    <Auth0Provider
      domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dev-t0pa1ah6r1n2wc4a.us.auth0.com'}
      clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || 'Q7IpCDbQGniIiqT7V2qmHXFf2ZBiEvSe'}
      authorizationParams={{
        redirect_uri: getRedirectUri(),
        // Include additional params for better error handling
        response_mode: 'query',
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
      onRedirectCallback={(appState) => {
        // Navigate to the path after login, or to home page
        window.location.pathname = appState?.returnTo || '/';
      }}
    >
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Auth0Provider>
  );
}
