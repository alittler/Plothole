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

  const handleGoogleLogin = () => {
    loginWithRedirect({
      authorizationParams: {
        connection: 'google-oauth2',
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
            {/* Google Sign In - Top */}
            <button
              onClick={handleGoogleLogin}
              disabled={isAuthLoading}
              className="w-full py-3 px-4 bg-white hover:bg-gray-100 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-800 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isAuthLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </>
              )}
            </button>

            {/* Standard Sign In */}
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

            {/* Continue as Guest */}
            {onGuestAccess && (
              <button
                onClick={onGuestAccess}
                disabled={isAuthLoading}
                className="w-full py-3 px-4 bg-transparent border border-slate-600 hover:border-slate-500 disabled:border-slate-700 disabled:cursor-not-allowed text-slate-300 hover:text-white font-semibold rounded-lg transition-colors"
              >
                Continue as Guest
              </button>
            )}

            {/* Create Account */}
            <button
              onClick={() => {
                handleSignUp();
              }}
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
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-500">
          &copy; 2026 Plothole. All rights reserved.
        </p>
      </div>
    </div>
  );
};
