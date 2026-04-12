'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

const BrowserRouterWrapper = dynamic(() => import('./BrowserRouterWrapper').then(mod => mod.BrowserRouterWrapper), { ssr: false });

export function ClientWrapper({ children }: { children: ReactNode }) {
  return <BrowserRouterWrapper>{children}</BrowserRouterWrapper>;
}
