import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GraduationCap, ArrowRight, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';
import { RobotIllustration } from '../components/Illustrations';
import { api } from '../api/client';

export const LoginPage = () => {
  const { setCurrentPage, setUser, refreshUser } = useApp();

  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Check URL parameters for OAuth errors
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error');
    if (oauthError) {
      setError(`Google Sign-In note: ${oauthError.replace(/_/g, ' ')}`);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError('');
    try {
      const data = await api.getGoogleLoginUrl(window.location.origin);
      if (data && data.url) {
        window.location.href = data.url;
      } else {
        window.location.href = `http://127.0.0.1:8000/accounts/google/login/?origin=${encodeURIComponent(window.location.origin)}`;
      }
    } catch (err) {
      console.warn('Google URL fetch failed, trying direct endpoint:', err);
      window.location.href = `http://127.0.0.1:8000/accounts/google/login/?origin=${encodeURIComponent(window.location.origin)}`;
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both your username/email and password.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const data = await api.login({ username, password });
      if (data && data.user) {
        setUser(data.user);
        await refreshUser();
        setCurrentPage('chat');
      } else {
        setError('Login failed: Invalid credentials.');
      }
    } catch (err) {
      setError(err.message || 'Invalid username/email or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setError('Username, email, and password are required.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const data = await api.register({
        username,
        email,
        password,
        first_name: firstName,
        last_name: lastName
      });

      if (data && data.user) {
        setUser(data.user);
        await refreshUser();
        setCurrentPage('chat');
      } else {
        setSuccessMsg('Account created successfully! You can now log in.');
        setActiveTab('login');
      }
    } catch (err) {
      setError(err.message || 'Unable to register account. Username or email may already be in use.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (typeof window !== 'undefined' && window.location.search.includes('auth_token')) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#0B0F19] text-gray-900 dark:text-white">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-base font-bold font-display tracking-tight">Smart<span className="text-indigo-600">Educator</span></div>
        <div className="text-xs text-gray-400 mt-1">Signing you in with Google...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex bg-[#F8FAFC] dark:bg-[#0B0F19] text-gray-900 dark:text-gray-100 transition-colors">
      {/* Left Form Column */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 md:p-12 lg:p-14 z-10 bg-white dark:bg-[#111827] overflow-y-auto">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
            <GraduationCap size={22} />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight text-gray-900 dark:text-white font-display">
              Smart<span className="text-indigo-600 dark:text-indigo-400">Educator</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              AI Powered Learning Assistant
            </p>
          </div>
        </div>

        {/* Center Auth Form */}
        <div className="max-w-md w-full mx-auto py-6">
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight font-display">
              {activeTab === 'login' ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {activeTab === 'login'
                ? 'Login to access your personal study materials and chats'
                : 'Get started with isolated memory and your own study workspace'}
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setError(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'login'
                  ? 'bg-white dark:bg-[#1F2937] text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <LogIn size={14} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('register'); setError(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'register'
                  ? 'bg-white dark:bg-[#1F2937] text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <UserPlus size={14} />
              <span>Create Account</span>
            </button>
          </div>

          {/* Google Sign-In Button */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A2234] hover:bg-gray-50 dark:hover:bg-[#1F293D] text-gray-700 dark:text-gray-200 font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-3 active:scale-[0.99]"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-[#111827] px-3 text-gray-400 font-medium tracking-wider">
                  Or continue with password
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {successMsg}
            </div>
          )}

          {activeTab === 'login' ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Username or Email
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username or email"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1A2234] text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-[#161D2F] transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setCurrentPage('reset-request')}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full px-4 py-2.5 pr-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1A2234] text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-[#161D2F] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-indigo-600/25 transition-all duration-150 flex items-center justify-center gap-2 mt-2"
              >
                <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1A2234] text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-[#161D2F] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1A2234] text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-[#161D2F] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1A2234] text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-[#161D2F] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1A2234] text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-[#161D2F] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Password (min 8 characters)
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create password"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1A2234] text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-[#161D2F] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1A2234] text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-[#161D2F] transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-indigo-600/25 transition-all duration-150 flex items-center justify-center gap-2 mt-2"
              >
                <span>{isSubmitting ? 'Creating account...' : 'Create Account'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* Toggle Tab Footer */}
          <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            {activeTab === 'login' ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => { setActiveTab('register'); setError(''); }}
                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Create one now
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setActiveTab('login'); setError(''); }}
                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Sign in here
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-gray-400 pt-4">
          SmartEducator RAG Platform &copy; 2026. Secure & Isolated Per User.
        </div>
      </div>

      {/* Right Column with Illustration */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#EEF2FF] to-[#FAF5FF] dark:from-[#111827] dark:to-[#1E1B4B] items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-purple-400/15 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col items-center">
          <RobotIllustration />
        </div>
      </div>
    </div>
  );
};

