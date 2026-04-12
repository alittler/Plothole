'use client';

import type { Metadata } from 'next';
import { Auth0Provider } from '@auth0/auth0-react';
import '../src/index.css';

// Note: metadata export not allowed in client components, remove if needed
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0, viewport-fit=cover" />
        <title>Plothole — Your Story, Decoded</title>
      </head>
      <body>
        <Auth0Provider
          domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dev-t0pa1ah6r1n2wc4a.us.auth0.com'}
          clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || 'Q7IpCDbQGniIiqT7V2qmHXFf2ZBiEvSe'}
          authorizationParams={{
            redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
          }}
        >
          {children}
        </Auth0Provider>
      </body>
    </html>
  );
}
