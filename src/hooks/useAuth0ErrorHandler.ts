import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export function useAuth0ErrorHandler() {
  const { error: auth0Error, isLoading } = useAuth0();

  useEffect(() => {
    if (auth0Error && !isLoading) {
      const errorMessage = auth0Error.error || 'Unknown';
      const errorDescription = auth0Error.error_description || '';

      // Handle invalid/expired refresh token
      if (
        errorMessage === 'invalid_grant' &&
        errorDescription.includes('refresh token')
      ) {
        console.error('[Auth0 Refresh Token Error]', {
          error: errorMessage,
          description: errorDescription,
          timestamp: new Date().toISOString(),
        });

        // Clear the invalid token cache
        try {
          if (typeof window !== 'undefined') {
            const cacheKey = `@@auth0spajs@@::${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}::${process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID}::`;
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith(cacheKey)) {
                localStorage.removeItem(key);
              }
            });
            sessionStorage.clear();
          }
        } catch (err) {
          console.error('[Auth0] Failed to clear cache:', err);
        }

        // Reload to trigger re-authentication
        window.location.href = '/';
      } else if (errorMessage === 'access_denied') {
        console.warn('[Auth0 Access Denied]', {
          error: errorMessage,
          description: errorDescription,
        });
      } else if (errorMessage) {
        console.warn('[Auth0 Error]', {
          error: errorMessage,
          description: errorDescription,
        });
      }
    }
  }, [auth0Error, isLoading]);
}
