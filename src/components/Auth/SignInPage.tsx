import React from 'react';
import { useClerk } from '@clerk/clerk-react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

export const SignInPage: React.FC = () => {
  const { buildSignInUrl } = useClerk();

  const handleCustomSignIn = () => {
    const signInUrl = buildSignInUrl();
    // Open in a new window to avoid iframe embedding restrictions
    window.open(signInUrl, '_blank', 'width=600,height=700');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md flex flex-col items-center"
      >
        <div className="mb-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
            <Sparkles className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">
            Plothole AI
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-center mt-2 italic">
            Your Research & Writing Partner
          </p>
        </div>

        <div className="w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden p-8 flex flex-col items-center text-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Authentication Required</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">
            To protect your security, the sign-in page must be opened in a secure popup window.
          </p>
          
          <button 
            onClick={handleCustomSignIn}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
          >
            Open Sign-In Window
          </button>
        </div>
      </motion.div>
    </div>
  );
};
