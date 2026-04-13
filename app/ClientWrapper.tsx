'use client';

import { ReactNode } from 'react';
import { BrowserRouterWrapper } from './BrowserRouterWrapper';

export function ClientWrapper({ children }: { children: ReactNode }) {
  return <BrowserRouterWrapper>{children}</BrowserRouterWrapper>;
}
