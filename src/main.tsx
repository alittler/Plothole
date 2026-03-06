import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.tsx';
import './index.css';

let PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (PUBLISHABLE_KEY?.startsWith('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=')) {
  PUBLISHABLE_KEY = PUBLISHABLE_KEY.replace('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=', '');
}

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <HashRouter>
        <App />
      </HashRouter>
    </ClerkProvider>
  </StrictMode>,
);
