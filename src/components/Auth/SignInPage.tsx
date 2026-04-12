import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { motion } from 'motion/react';
import { Sparkles, Shield, Mail, Loader2, ArrowRight, UserPlus } from 'lucide-react';

export const SignInPage: React.FC<{ onGuestAccess?: () => void }> = ({ onGuestAccess }) => {
  const { loginWithRedirect, isLoading: isAuthLoading } = useAuth0();

  const handleAuthorize = () => {
    loginWithRedirect();
  };

  const handleSignUp = () => {
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup',
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative py-6 md:py-20 selection:bg-indigo-500/30 overflow-y-auto">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-[440px] z-10"
      >
        {/* Branding Header */}
        <div className="flex flex-col items-center mb-6 md:mb-10 text-center px-4">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-3xl md:rounded-2xl flex items-center justify-center shadow-2xl mb-4 md:mb-6 relative">
            <Shield size={32} className="md:size-[40px] text-slate-950" />
            <div className="absolute -top-1 -right-1">
              <div className="p-1.5 bg-indigo-600 rounded-full text-white shadow-lg">
                <Sparkles size={10} className="md:size-[12px]" />
              </div>
            </div>
          </div>
          
          <h1 className="text-2xl md:text-4xl font-black tracking-[0.2em] text-white uppercase mb-1 md:mb-2">
            Plothole
          </h1>
          <div className="h-px w-10 md:w-12 bg-indigo-500/50 mb-2 md:mb-4" />
          <p className="text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-[0.3em]">
            Story Architect Terminal
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/5 overflow-hidden p-6 md:p-10 space-y-6 md:space-y-8">
          <div className="space-y-6 md:space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-black uppercase text-slate-900 dark:text-white tracking-tight">Identity Verification</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Access the Narrative Intelligence Core</p>
            </div>

            <div className="space-y-4">
              <button 
                onClick={handleAuthorize}
                disabled={isAuthLoading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/20"
              >
                {isAuthLoading ? <Loader2 size={16} className="animate-spin" /> : <>Authorize Access <ArrowRight size={14} /></>}
              </button>

              <button 
                onClick={handleSignUp}
                disabled={isAuthLoading}
                className="w-full py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                Establish New Identity <UserPlus size={14} />
              </button>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800"></div></div>
              <span className="relative px-4 bg-white dark:bg-slate-900 text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                Emergency Access
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {onGuestAccess && (
                <button
                  type="button"
                  onClick={onGuestAccess}
                  className="w-full text-center text-slate-400 hover:text-emerald-500 text-[8px] font-black uppercase tracking-[0.3em] transition-colors flex items-center justify-center gap-2"
                >
                  Continue as Anonymous Guest
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-6 md:mt-8 text-center text-slate-600 text-[8px] md:text-[10px] font-black uppercase tracking-widest">
          &copy; 2026 Narrative Intelligence Systems &bull; v1.0.7
        </p>
      </motion.div>
    </div>
  );
};
