import React from 'react';
import { SignIn } from '@clerk/clerk-react';

export const SignInPage: React.FC<{ appName?: string, isReady?: boolean }> = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4">
      <div className="w-full max-w-md flex flex-col items-center">
        <SignIn 
          routing="virtual"
          fallbackRedirectUrl="/Dashboard"
          appearance={{
            elements: {
              formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 text-sm font-bold uppercase tracking-widest rounded-xl",
              card: "shadow-2xl border-none p-8 bg-white dark:bg-slate-900 rounded-3xl",
              headerTitle: "text-slate-900 dark:text-white font-black uppercase tracking-tight",
              socialButtonsBlockButton: "rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
              footerActionLink: "text-indigo-600 hover:text-indigo-700 font-bold",
              formFieldInput: "rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 transition-all",
            }
          }}
        />
      </div>
    </div>
  );
};
