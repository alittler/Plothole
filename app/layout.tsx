import type { Metadata } from 'next';
import { ClientWrapper } from './ClientWrapper';
import '../src/index.css';

export const metadata: Metadata = {
  title: 'Plothole — Your Story, Decoded',
  description: 'Your Story, Decoded',
  icons: {
    icon: '/logos/plothole_32x32.png',
    apple: '/logos/plothole_256x256.png',
    other: [
      {
        rel: 'icon',
        url: '/logos/plothole_64x64.png',
        sizes: '64x64',
      },
      {
        rel: 'icon',
        url: '/logos/plothole_256x256.png',
        sizes: '256x256',
      },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Plothole',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        {/* Mobile Web App Capabilities */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Plothole" />
        <meta name="apple-mobile-web-app-title" content="Plothole" />
        {/* Theme Colors */}
        <meta name="theme-color" content="#06232D" />
        <meta name="msapplication-TileColor" content="#06232D" />
        <meta name="msapplication-navbutton-color" content="#06232D" />
        {/* Apple Specific */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* Microsoft Specific */}
        <meta name="msapplication-config" content="/browserconfig.xml" />
        {/* Android Specific */}
        <meta name="android-chrome-mobile-web-app-capable" content="yes" />
        {/* Viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0, viewport-fit=cover" />
        {/* Format Detection */}
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body>
        <ClientWrapper>
          {children}
        </ClientWrapper>
      </body>
    </html>
  );
}
