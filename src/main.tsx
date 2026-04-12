import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain="dev-t0pa1ah6r1n2wc4a.us.auth0.com"
      clientId="Q7IpCDbQGniIiqT7V2qmHXFf2ZBiEvSe"
      authorizationParams={{
        redirect_uri: window.location.origin
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Auth0Provider>
  </StrictMode>,
);
