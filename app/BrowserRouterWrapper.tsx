'use client';

import { ReactNode, useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';

export function BrowserRouterWrapper({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
  const auth0ClientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
  const auth0Audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  // Get the redirect URI - use the current origin for client-side redirects
  const getRedirectUri = () => {
    if (typeof window === 'undefined') return undefined;
    return window.location.origin;
  };

  if (!auth0Domain || !auth0ClientId) {
    return (
      <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded m-4">
        Missing Auth0 configuration. Set NEXT_PUBLIC_AUTH0_DOMAIN and NEXT_PUBLIC_AUTH0_CLIENT_ID.
      </div>
    );
  }

  return (
    <Auth0Provider
      domain={auth0Domain}
      clientId={auth0ClientId}
      authorizationParams={{
        redirect_uri: getRedirectUri(),
        ...(auth0Audience ? { audience: auth0Audience } : {}),
        scope: 'openid profile email offline_access',
        response_mode: 'query',
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
      onRedirectCallback={(appState) => {
        // Don't redirect here - let React Router handle navigation
        // The app will naturally re-render when auth state updates
      }}
    >
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Auth0Provider>
  );
}
