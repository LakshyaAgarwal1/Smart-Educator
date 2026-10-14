import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GraduationCap, ArrowLeft, Send } from 'lucide-react';
import { ResetRequestIllustration } from '../components/Illustrations';
import { api } from '../api/client';

export const PasswordResetRequestPage = () => {
  const { setCurrentPage, setResetEmail, setResetCodePreview } = useApp();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [codePreview, setCodePreview] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setError('');
    try {
      const res = await api.requestPasswordReset({ email });
      setResetEmail(email);
      if (res?.code_preview) {
        setCodePreview(res.code_preview);
        setResetCodePreview(res.code_preview);
      }
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to dispatch recovery code. Please check your email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F8FAFC] dark:bg-[#0B0F19] text-gray-900 dark:text-gray-100 transition-colors">
      {/* Left Form Column (Screen 10) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 md:p-14 lg:p-16 z-10 bg-white dark:bg-[#111827]">
        {/* Brand */}
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

        {/* Center Content */}
        <div className="max-w-md w-full mx-auto py-8">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight font-display">
              Reset Password
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
              Enter your email address and we'll dispatch a 6-digit recovery code to reset your password.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {submitted ? (
            <div className="space-y-6 animate-fade-in">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs leading-relaxed space-y-2">
                <div>
                  A 6-digit verification code has been dispatched to <strong>{email}</strong>.
                </div>
                {codePreview && (
                  <div className="mt-2 p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 font-mono text-emerald-900 dark:text-emerald-200 text-sm font-bold flex items-center justify-between">
                    <span>Dev/Testing Code:</span>
                    <span className="tracking-widest text-base">{codePreview}</span>
                  </div>
                )}
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Please check your inbox (and spam folder) and enter the code to set a new password.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage('reset-confirm')}
                className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                <span>Enter 6-Digit Code & Set Password</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1A2234] text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-600 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all duration-150 flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? 'Sending Code...' : 'Send Recovery Code'}</span>
                <Send size={15} />
              </button>
            </form>
          )}

          <div className="mt-8 text-center">
            <button
              onClick={() => setCurrentPage('login')}
              className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to login</span>
            </button>
          </div>
        </div>

        <div className="text-center text-[11px] text-gray-400">
          SmartEducator RAG Platform &copy; 2026.
        </div>
      </div>

      {/* Right Column with Illustration (Screen 10) */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#EEF2FF] to-[#FAF5FF] dark:from-[#111827] dark:to-[#1E1B4B] items-center justify-center p-12 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center">
          <ResetRequestIllustration />
        </div>
      </div>
    </div>
  );
};
