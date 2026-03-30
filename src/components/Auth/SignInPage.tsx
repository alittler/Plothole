import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

export const SignInPage: React.FC<{ appName?: string }> = ({ appName = 'Plothole AI' }) => {
  const [isClerkReady, setIsClerkReady] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsClerkReady(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!isClerkReady) {
    return <div className="min-h-screen bg-black w-full h-full" />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md flex flex-col items-center"
      >
        <div className="mb-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
            <Sparkles className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">
            {appName}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-center mt-2 italic">
            Your Research & Writing Partner
          </p>
        </div>

        <div className="w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden p-8 flex flex-col items-center">
          <SignIn 
            routing="virtual"
            fallbackRedirectUrl="/Dashboard"
            appearance={{
              elements: {
                formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 text-sm font-bold uppercase tracking-widest rounded-xl",
                card: "shadow-none border-none p-0 bg-transparent",
                headerTitle: "hidden",
                socialButtonsBlockButton: "rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                footerActionLink: "text-indigo-600 hover:text-indigo-700 font-bold",
                formFieldInput: "rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 transition-all",
              }
            }}
          />
        </div>
      </motion.div>
    </div>
  );
};
