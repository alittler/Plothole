import React from 'react';
import { SignIn } from '@clerk/clerk-react';

export const SignInPage: React.FC = () => {
  const hasClerk = !!(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || (window as any).CLERK_PUBLISHABLE_KEY);

  return (
    <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      {hasClerk ? (
        <SignIn routing="hash" />
      ) : (
        <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-4">Authentication Required</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6 font-medium">
            Clerk authentication is not yet configured. Please set your Publishable Key in the environment secrets.
          </p>
          <button 
            onClick={() => window.location.hash = '#/'}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
          >
            Return to Bookshelf
          </button>
        </div>
      )}
    </div>
  );
};
