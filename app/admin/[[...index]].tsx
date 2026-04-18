'use client';

import keystatic from '../../keystatic.config';
import { KeystaticProvider } from '@keystatic/next/ui/app';

export default function AdminPage() {
  return (
    <KeystaticProvider>
      <keystatic.Admin />
    </KeystaticProvider>
  );
}
