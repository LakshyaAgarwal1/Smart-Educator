import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GraduationCap, ArrowLeft, Check, Eye, EyeOff } from 'lucide-react';
import { ResetConfirmIllustration } from '../components/Illustrations';
import { api } from '../api/client';

export const PasswordResetConfirmPage = () => {
  const { setCurrentPage, resetEmail, resetCodePreview } = useApp();
  const [email, setEmail] = useState(resetEmail || '');
  const [code, setCode] = useState(resetCodePreview || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendNotice, setResendNotice] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    if (!email) {
      setError('Please provide your email address to resend the code.');
      return;
    }
    setIsResending(true);
    setError('');
    setResendNotice('');
    try {
      const res = await api.requestPasswordReset({ email });
      if (res?.code_preview) {
        setCode(res.code_preview);
      }
      setResendNotice(`A new 6-digit verification code has been dispatched to ${email}.`);
    } catch (err) {
      setError(err.message || 'Failed to resend recovery code.');
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!code.trim() || code.trim().length !== 6) {
      setError('Please enter the 6-digit recovery code sent to your email.');
      return;
    }
    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await api.confirmPasswordReset({
        email: email.trim(),
        code: code.trim(),
        password: newPassword,
        confirm_password: confirmPassword,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please check your verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F8FAFC] dark:bg-[#0B0F19] text-gray-900 dark:text-gray-100 transition-colors">
      {/* Left Column (Screen 11) */}
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
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight font-display">
              Set New Password
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
              Enter the 6-digit recovery code sent to your email and your new password.
            </p>
          </div>

          {resendNotice && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
              {resendNotice}
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {success ? (
            <div className="space-y-6 animate-fade-in">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs leading-relaxed flex items-center gap-3">
                <Check size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Your password has been successfully reset! You can now log in with your new credentials.</span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage('login')}
                className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                <span>Proceed to Login</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Account Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your account email"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1A2234] text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-600 transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    6-Digit Recovery Code
                  </label>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {isResending ? 'Sending...' : 'Resend Code'}
                  </button>
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="e.g. 123456"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1A2234] text-base font-mono tracking-widest text-center text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-600 transition-all font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 characters)"
                    className="w-full px-4 py-2.5 pr-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1A2234] text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-2.5 pr-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1A2234] text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(prev => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all duration-150 flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? 'Resetting Password...' : 'Reset Password'}</span>
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

      {/* Right Column with Illustration (Screen 11) */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#EEF2FF] to-[#FAF5FF] dark:from-[#111827] dark:to-[#1E1B4B] items-center justify-center p-12 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center">
          <ResetConfirmIllustration />
        </div>
      </div>
    </div>
  );
};
