import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Loader2, LogIn, UserPlus } from 'lucide-react';

export const SignInPage: React.FC<{ onGuestAccess?: () => void }> = ({ onGuestAccess }) => {
  const { loginWithRedirect, isLoading: isAuthLoading } = useAuth0();

  const handleLogin = () => {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <img src="/logos/plothole_256x256.png" alt="Plothole" className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">Plothole</h1>
          <p className="text-slate-400">Your Story, Decoded</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-8 space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-semibold text-white">Sign In</h2>
            <p className="text-sm text-slate-400">Access your writing workspace</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleLogin}
              disabled={isAuthLoading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isAuthLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>

            <button
              onClick={handleSignUp}
              disabled={isAuthLoading}
              className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isAuthLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Create Account
                </>
              )}
            </button>
          </div>

          {onGuestAccess && (
            <>
              <div className="relative flex items-center gap-4">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-xs text-slate-500 font-medium">OR</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>

              <button
                onClick={onGuestAccess}
                disabled={isAuthLoading}
                className="w-full py-3 px-4 bg-transparent border border-slate-600 hover:border-slate-500 disabled:border-slate-700 disabled:cursor-not-allowed text-slate-300 hover:text-white font-semibold rounded-lg transition-colors"
              >
                Continue as Guest
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-500">
          &copy; 2026 Plothole. All rights reserved.
        </p>
      </div>
    </div>
  );
};
