import React, { useState } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import { ArrowLeft, ShieldCheck, Lock, UserCheck, AlertCircle } from 'lucide-react';
import { auth, googleProvider, BOOTSTRAPPED_ADMIN_EMAIL } from '../firebase';

interface AuthViewProps {
  initialPortal: 'investor' | 'admin';
  onBack: () => void;
}

export function AuthView({ initialPortal, onBack }: AuthViewProps) {
  const [portal, setPortal] = useState<'investor' | 'admin'>(initialPortal);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }
    if (authTab === 'register' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      if (authTab === 'register' && portal === 'investor') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        }
        await sendEmailVerification(cred.user).catch(() => {});
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed.';
      if (message.includes('auth/operation-not-allowed')) {
        setError(
          'Email/Password sign-in is not yet enabled in Firebase Authentication Console. Use "Continue with Google" below for instant access.'
        );
      } else if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (message.includes('auth/email-already-in-use')) {
        setError('An account with this email already exists. Switch to "Sign In" or use Google Sign-In.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col">
      <header className="border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Overview
        </button>
        <span className="text-sm font-display font-semibold text-white">
          Smart Investor Forecasting System
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#0B1120] border border-slate-800 rounded-xl p-7 space-y-6">
          {/* Portal Switcher: Investor vs Admin */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#070B14] border border-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setPortal('investor');
                setError(null);
              }}
              className={`py-2 px-3 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                portal === 'investor'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Investor Access
            </button>
            <button
              type="button"
              onClick={() => {
                setPortal('admin');
                setAuthTab('login');
                setError(null);
              }}
              className={`py-2 px-3 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                portal === 'admin'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin Portal
            </button>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-display font-bold text-white">
              {portal === 'admin'
                ? 'Administrator Console Sign-In'
                : authTab === 'register'
                ? 'Create Investor Account'
                : 'Investor Workspace Sign-In'}
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              {portal === 'admin'
                ? `Restricted to verified administrators (${BOOTSTRAPPED_ADMIN_EMAIL} or authorized admin accounts).`
                : 'Access real-time analytics, portfolio tracking, forecasting models, and downloadable research reports.'}
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-lg bg-rose-950/50 border border-rose-800/70 text-xs text-rose-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Primary Instant Google Sign-In */}
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-medium text-sm transition-colors flex items-center justify-center gap-2.5 disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            {loading ? 'Authenticating...' : 'Continue with Google'}
          </button>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-800" />
            <span className="shrink-0 mx-3 text-xs text-slate-500">or email credentials</span>
            <div className="flex-grow border-t border-slate-800" />
          </div>

          {portal === 'investor' && (
            <div className="flex gap-4 border-b border-slate-800 text-xs font-medium">
              <button
                type="button"
                onClick={() => setAuthTab('login')}
                className={`pb-2 border-b-2 transition-colors ${
                  authTab === 'login'
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthTab('register')}
                className={`pb-2 border-b-2 transition-colors ${
                  authTab === 'register'
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {portal === 'investor' && authTab === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Aarav Mehta"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#070B14] border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={portal === 'admin' ? BOOTSTRAPPED_ADMIN_EMAIL : 'investor@domain.com'}
                className="w-full px-3.5 py-2 rounded-lg bg-[#070B14] border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 rounded-lg bg-[#070B14] border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Lock className="w-4 h-4" />
              {portal === 'admin'
                ? 'Sign In to Admin Portal'
                : authTab === 'register'
                ? 'Register Investor Account'
                : 'Sign In with Email'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
