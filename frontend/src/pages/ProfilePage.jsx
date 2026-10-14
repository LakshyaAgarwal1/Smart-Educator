import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  User, Key, Link2, Sliders, LogOut, FileText, MessageSquare, HardDrive, Edit3, Check, Camera, Trash2, Loader2
} from 'lucide-react';
import { api } from '../api/client';

export const ProfilePage = () => {
  const { user, userStats, setUser, setCurrentPage, refreshUser, logout } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const [picError, setPicError] = useState('');
  const [picSuccess, setPicSuccess] = useState('');
  const fileInputRef = useRef(null);

  const handleProfilePicChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPicError('Please select a valid image file (JPEG, PNG, WEBP, etc.).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPicError('Image size cannot exceed 5MB.');
      return;
    }

    setPicError('');
    setPicSuccess('');
    setIsUploadingPic(true);

    const formData = new FormData();
    formData.append('profile_picture', file);

    try {
      const res = await api.uploadProfilePicture(formData);
      if (res?.user) {
        setUser(res.user);
      }
      await refreshUser();
      setPicSuccess('Profile picture updated successfully!');
      setTimeout(() => setPicSuccess(''), 3000);
    } catch (err) {
      setPicError(err.message || 'Failed to upload profile picture.');
    } finally {
      setIsUploadingPic(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveProfilePic = async () => {
    if (!window.confirm('Remove your profile picture?')) return;
    setIsUploadingPic(true);
    setPicError('');
    setPicSuccess('');
    try {
      const res = await api.removeProfilePicture();
      if (res?.user) {
        setUser(res.user);
      }
      await refreshUser();
      setPicSuccess('Profile picture removed.');
      setTimeout(() => setPicSuccess(''), 3000);
    } catch (err) {
      setPicError(err.message || 'Failed to remove profile picture.');
    } finally {
      setIsUploadingPic(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await api.updateProfile({
        first_name: firstName,
        last_name: lastName,
        email: email
      });
      if (res?.user) {
        setUser(res.user);
      } else {
        setUser(prev => ({ ...prev, first_name: firstName, last_name: lastName, email }));
      }
      await refreshUser();
      setIsEditing(false);
    } catch (e) {
      setIsEditing(false);
    }
  };

  const profilePicUrl = user?.profile?.profile_picture;
  const initial = firstName ? firstName[0].toUpperCase() : (user?.username ? user.username[0].toUpperCase() : 'U');

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors">
      <div className="max-w-3xl mx-auto space-y-6">
        {picSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-fade-in">
            <Check size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span>{picSuccess}</span>
          </div>
        )}

        {picError && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs font-semibold text-red-700 dark:text-red-300 animate-fade-in">
            {picError}
          </div>
        )}

        {/* Profile Header Card */}
        <div className="bg-white dark:bg-[#161D2F] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Avatar with Upload Capability */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-3xl flex items-center justify-center shadow-lg ring-4 ring-indigo-50 dark:ring-indigo-950/60 relative">
                {profilePicUrl ? (
                  <img
                    src={profilePicUrl}
                    alt={`${user?.first_name || user?.username}'s avatar`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <span>{initial}</span>
                )}

                {isUploadingPic && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                    <Loader2 size={24} className="animate-spin" />
                  </div>
                )}
              </div>

              {/* Upload Camera Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPic}
                className="absolute bottom-0 right-0 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-md transition-all hover:scale-110 ring-2 ring-white dark:ring-[#161D2F]"
                title="Upload Profile Picture"
              >
                <Camera size={14} />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePicChange}
                className="hidden"
              />
            </div>

            <div>
              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First Name"
                      className="px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last Name"
                      className="px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <div className="flex gap-2 pt-1">
                    <button type="submit" className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold">
                      Save Changes
                    </button>
                    <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-1 border border-gray-300 dark:border-gray-700 text-xs rounded text-gray-600 dark:text-gray-300">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display">
                    {user?.first_name || user?.username || 'User'} {user?.last_name || ''}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {user?.email || 'No email provided'}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                    >
                      <Camera size={12} />
                      <span>{profilePicUrl ? 'Change Photo' : 'Upload Photo'}</span>
                    </button>

                    {profilePicUrl && (
                      <>
                        <span className="text-gray-300 dark:text-gray-600">•</span>
                        <button
                          type="button"
                          onClick={handleRemoveProfilePic}
                          className="text-[11px] font-semibold text-red-500 hover:underline inline-flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          <span>Remove Photo</span>
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {!isEditing && (
            <button
              onClick={() => {
                setFirstName(user?.first_name || '');
                setLastName(user?.last_name || '');
                setEmail(user?.email || '');
                setIsEditing(true);
              }}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Edit3 size={13} />
              <span>Edit Profile</span>
            </button>
          )}
        </div>

        {/* 3 Stats Row Cards (Screen 8) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Documents Stat */}
          <div className="bg-white dark:bg-[#161D2F] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm text-center">
            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Documents
            </div>
            <div className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1.5 font-display">
              {userStats?.documents_count || 24}
            </div>
          </div>

          {/* Chats Stat */}
          <div className="bg-white dark:bg-[#161D2F] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm text-center">
            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Chats
            </div>
            <div className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1.5 font-display">
              {userStats?.chats_count || 56}
            </div>
          </div>

          {/* Storage Used Stat */}
          <div className="bg-white dark:bg-[#161D2F] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm text-center">
            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Storage Used
            </div>
            <div className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1.5 font-display">
              {userStats?.storage_used || '1.2 GB'}
            </div>
          </div>
        </div>

        {/* Action Menu List (Screen 8) */}
        <div className="bg-white dark:bg-[#161D2F] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm divide-y divide-gray-100 dark:divide-gray-800/80 overflow-hidden">
          <button
            onClick={() => setCurrentPage('reset-confirm')}
            className="w-full px-6 py-4 flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Key size={16} className="text-gray-400" />
              <span>Change Password</span>
            </div>
          </button>

          <button
            onClick={() => setCurrentPage('drive')}
            className="w-full px-6 py-4 flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Link2 size={16} className="text-gray-400" />
              <span>Connected Accounts</span>
            </div>
          </button>

          <button
            onClick={() => setCurrentPage('settings')}
            className="w-full px-6 py-4 flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Sliders size={16} className="text-gray-400" />
              <span>Preferences</span>
            </div>
          </button>

          <button
            onClick={() => logout()}
            className="w-full px-6 py-4 flex items-center justify-between text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <LogOut size={16} />
              <span>Logout</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
