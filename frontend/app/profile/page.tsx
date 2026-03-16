'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useCurrentUser } from '@/hooks/useApi';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { getErrorMessage } from '@/lib/error';
import api from '@/lib/api';

export default function ProfilePage() {
  const { data: user, refetch } = useCurrentUser();
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const addToast = useToastStore((s) => s.addToast);

  const [form, setForm] = useState({ full_name: '', notification_email: true });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [error, setError] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({ full_name: user.full_name, notification_email: user.notification_email });
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setSaving(true);
    try {
      await api.patch(`/api/v1/users/${user.id}`, {
        full_name: form.full_name,
        notification_email: form.notification_email,
      });
      await fetchMe();
      await refetch();
      addToast('success', 'Profile updated successfully');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');

    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwError('Passwords do not match');
      return;
    }

    if (!user) return;
    setChangingPw(true);
    try {
      await api.post(`/api/v1/users/${user.id}/change-password`, {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
      addToast('success', 'Password changed successfully');
    } catch (err: unknown) {
      setPwError(getErrorMessage(err));
    } finally {
      setChangingPw(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-gray-50 p-6">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">My Profile</h2>

            {/* 기본 정보 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Profile Information</h3>
              {error && <div className="bg-red-50 text-red-600 text-sm rounded-md p-3 mb-4">{error}</div>}
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Email</label>
                  <input value={user.email} disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Role</label>
                  <input value={user.role} disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Full Name</label>
                  <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={form.notification_email}
                      onChange={(e) => setForm({ ...form, notification_email: e.target.checked })}
                      className="rounded" />
                    Receive email notifications
                  </label>
                </div>
                <button type="submit" disabled={saving}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>

            {/* 비밀번호 변경 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Change Password</h3>
              {pwError && <div className="bg-red-50 text-red-600 text-sm rounded-md p-3 mb-4">{pwError}</div>}
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Current Password</label>
                  <input type="password" value={pwForm.current_password}
                    onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">New Password</label>
                  <input type="password" value={pwForm.new_password}
                    onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                    required minLength={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="text-xs text-gray-400 mt-1">
                    Min 8 chars, must include uppercase, lowercase, digit, and special character
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Confirm New Password</label>
                  <input type="password" value={pwForm.confirm_password}
                    onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button type="submit" disabled={changingPw}
                  className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50 text-sm transition-colors">
                  {changingPw ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
