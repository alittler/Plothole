'use client';

import { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';

export function BrowserRouterWrapper({ children }: { children: ReactNode }) {
  return (
    <Auth0Provider
      domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dev-t0pa1ah6r1n2wc4a.us.auth0.com'}
      clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || 'Q7IpCDbQGniIiqT7V2qmHXFf2ZBiEvSe'}
      authorizationParams={{
        redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Auth0Provider>
  );
}
