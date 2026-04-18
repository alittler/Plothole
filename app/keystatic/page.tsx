'use client';

import React from 'react';

export default function KeystaticPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Keystatic CMS</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Keystatic requires configuration with a storage backend (Cloud, GitHub, or Local). 
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-500">
          For now, use Decap CMS at <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">/admin/</code>
        </p>
        <a 
          href="/admin/" 
          className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Go to Decap CMS
        </a>
      </div>
    </div>
  );
}
