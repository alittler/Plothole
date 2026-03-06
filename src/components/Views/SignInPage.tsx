import React from 'react';
import { SignIn } from '@clerk/clerk-react';

export const SignInPage: React.FC = () => {
  return (
    <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <SignIn />
    </div>
  );
};
