'use client';

import { ReactNode, useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';

export function BrowserRouterWrapper({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
}
