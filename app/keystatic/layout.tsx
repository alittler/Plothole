'use client';

import React from 'react';

export default function KeystaticLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {children}
    </div>
  );
}
