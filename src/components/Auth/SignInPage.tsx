import React, { useState } from 'react';
import { useSignIn, useSignUp } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Shield, Mail, Lock, Loader2, AlertCircle, ArrowRight, UserPlus, Key } from 'lucide-react';

export const SignInPage: React.FC<{ appName?: string, isReady?: boolean }> = () => {
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();
  
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUpMode ? !isSignUpLoaded : !isSignInLoaded) return;

    setIsPending(true);
    setError(null);

    try {
      if (isSignUpMode) {
        const result = await signUp.create({
          emailAddress: email,
          password,
        });

        if (result.status === 'complete') {
          await setSignUpActive({ session: result.createdSessionId });
        } else {
          // This usually happens if email verification is required
          setError('Verification required. Please check your email or use the official Clerk UI.');
        }
      } else {
        const result = await signIn.create({
          identifier: email,
          password,
        });

        if (result.status === 'complete') {
          await setSignInActive({ session: result.createdSessionId });
        } else {
          setError('Additional steps required. Please use the standard login.');
        }
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'An error occurred. Please try again.');
    } finally {
      setIsPending(false);
    }
  };

  const handleSocialLogin = (strategy: 'oauth_google' | 'oauth_github') => {
    const client = isSignUpMode ? signUp : signIn;
    if (!client) return;
    
    client.authenticateWithRedirect({
      strategy,
      redirectUrl: '/sso-callback',
      redirectUrlComplete: '/'
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
          <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-3xl md:rounded-[2.5rem] flex items-center justify-center shadow-2xl mb-4 md:mb-6 relative">
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
            {isSignUpMode ? 'Establish New Identity' : 'Story Architect Terminal'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/5 overflow-hidden p-6 md:p-10 space-y-6 md:space-y-8">
          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={() => handleSocialLogin('oauth_google')}
              className="flex items-center justify-center gap-3 py-3 md:py-4 px-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-[10px] md:text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white shadow-sm active:scale-95"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.18.96-.7 1.77-1.51 2.31v2.77h2.45c1.43-1.32 2.26-3.27 2.26-5.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-2.45-2.77c-.68.46-1.55.73-2.45.73-1.88 0-3.47-1.27-4.04-2.97H7.82v2.86A10.97 10.97 0 0 0 12 23z"/><path fill="currentColor" d="M7.96 15.33c-.14-.42-.22-.87-.22-1.33s.08-.91.22-1.33V9.81H7.82a10.97 10.97 0 0 0 0 8.38l2.14-2.86z"/><path fill="currentColor" d="M12 8.46c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 5.02 14.97 4 12 4 7.82 4 4.22 6.31 2.62 9.81l3.14 2.86c.57-1.7 2.16-2.97 4.04-2.97z"/></svg>
              Google Authority
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800"></div></div>
            <span className="relative px-4 bg-white dark:bg-slate-900 text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
              {isSignUpMode ? 'Identity Genesis' : 'Manual Override'}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
            <div className="space-y-3 md:space-y-4">
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={16} />
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="architect@plothole.ai"
                    className="w-full pl-10 md:pl-12 pr-4 py-3 md:py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-[12px] md:text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <label className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={16} />
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 md:pl-12 pr-4 py-3 md:py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-[12px] md:text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-3 p-2 md:p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-100 dark:border-rose-900/30 text-[8px] md:text-[10px] font-bold uppercase tracking-wider"
                >
                  <AlertCircle size={12} className="shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <button
                type="submit"
                disabled={isPending || (isSignUpMode ? !isSignUpLoaded : !isSignInLoaded)}
                className="w-full py-3.5 md:py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] md:text-xs shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    {isSignUpMode ? 'Create Identity' : 'Authorize Access'} 
                    {isSignUpMode ? <UserPlus size={14} /> : <ArrowRight size={14} />}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsSignUpMode(!isSignUpMode);
                  setError(null);
                }}
                className="w-full text-center text-slate-500 hover:text-indigo-500 text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                {isSignUpMode ? (
                  <><Key size={12} /> Already have an account? Sign In</>
                ) : (
                  <><UserPlus size={12} /> Don't have an account? Sign Up</>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <p className="mt-6 md:mt-8 text-center text-slate-600 text-[8px] md:text-[10px] font-black uppercase tracking-widest">
          &copy; 2026 Narrative Intelligence Systems &bull; v1.0.7
        </p>
      </motion.div>
    </div>
  );
};
