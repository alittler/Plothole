import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.tsx';
import './index.css';

const PUBLISHABLE_KEY = (import.meta as any).env.VITE_CLERK_PUBLISHABLE_KEY || 
                        (import.meta as any).env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY ||
                        (window as any).CLERK_PUBLISHABLE_KEY ||
                        (window as any)._env_?.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  console.warn("Missing Clerk Publishable Key. Auth features may not work.");
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      appearance={{
        layout: {
          socialButtonsVariant: 'iconButton',
          shimmer: true
        },
        variables: {
          colorPrimary: '#4f46e5',
          borderRadius: '1rem',
        },
        elements: {
          userProfileModalBox: {
            width: '100%',
            maxWidth: '480px',
            height: 'auto',
            maxHeight: '420px',
          },
          userButtonPopoverCard: {
            borderRadius: '1.5rem',
          }
        }
      }}
    >
      <HashRouter>
        <App />
      </HashRouter>
    </ClerkProvider>
  </StrictMode>,
);
