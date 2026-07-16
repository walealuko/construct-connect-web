'use client';

import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '@/components/UserContext';
import { updateProfile, deleteAccountAction } from '@/app/actions/user';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { toast } from 'sonner';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function EditProfilePage() {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Delete-account flow. The "Delete Account" button just opens
  // the confirm modal; the modal gates on the user typing their
  // own email and disables the confirm button until it matches.
  // Once the action returns success, the auth session is gone
  // and we route the user to / (the home page) — the cookie-
  // bound client can't sign in again because the user no longer
  // exists.
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    location: '',
    bio: '',
    business_name: '',
    business_type: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        if (data) {
          setFormData({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            phone: data.phone || '',
            location: data.location || '',
            bio: data.bio || '',
            business_name: data.business_name || '',
            business_type: data.business_type || '',
          });
        }
      } catch {
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const result = await updateProfile(user.id, formData);
      if (result.success) {
        toast.success("Profile updated successfully!");
      } else {
        toast.error(result.error || "Failed to update profile");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  // Delete the caller's account. The action handles the
  // confirmation-email check (case-insensitive match against
  // the session email) and runs the full cleanup. On success,
  // the auth session is gone — push the user to the home page
  // so they're not staring at a broken /profile/edit render.
  const handleDeleteAccount = async () => {
    if (!user?.email) return;
    setDeleting(true);
    try {
      const result = await deleteAccountAction(confirmDeleteEmail);
      if (!result.success) {
        toast.error(result.error || "Failed to delete account");
        return;
      }
      // Best-effort local signout. The auth.users row is already
      // gone so the call is a no-op, but cleaning the local
      // session storage prevents a stale JWT from lingering in
      // the tab.
      try {
        await supabase.auth.signOut();
      } catch {
        // Non-fatal.
      }
      toast.success("Account deleted");
      router.push("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
    } finally {
      setDeleting(false);
      setConfirmDeleteOpen(false);
      setConfirmDeleteEmail("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-gray-500 text-sm inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-black text-slate-900">Edit Profile</h1>
        </div>

        <Card>
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="font-bold text-slate-900">{user?.email}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Account Settings</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  autoComplete="given-name"
                />
                <Input
                  label="Last Name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  autoComplete="family-name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                />
                <Input
                  label="Location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  autoComplete="address-level2"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="profile-bio"
                  className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                >
                  Bio
                </label>
                <textarea
                  id="profile-bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={3}
                  className="w-full p-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Tell the community about yourself..."
                  autoComplete="off"
                />
              </div>

              {user?.role === 'business' || user?.role === 'artisan' ? (
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-4">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Business Details</p>
                  <Input
                    label="Business Name"
                    name="business_name"
                    value={formData.business_name}
                    onChange={handleChange}
                    autoComplete="organization"
                  />
                  <div className="space-y-1.5">
                    <label
                      htmlFor="profile-business-type"
                      className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                    >
                      Business Type
                    </label>
                    <select
                      id="profile-business-type"
                      name="business_type"
                      value={formData.business_type}
                      onChange={handleChange}
                      className="w-full p-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                      autoComplete="off"
                    >
                      <option value="">Select type</option>
                      <option value="sole_proprietor">Sole Proprietor</option>
                      <option value="company">Limited Liability Company</option>
                      <option value="partnership">Partnership</option>
                    </select>
                  </div>
                </div>
              ) : null}

              <Button
                type="submit"
                className="w-full py-6 text-lg"
                disabled={saving}
                isLoading={saving}
              >
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Danger zone — permanent account deletion. Sits below the
            main profile card so a casual scroll-past doesn't
            surface the destructive action too prominently, but
            it's reachable in one click for someone who knows
            where to look. The confirm modal gates on the user
            re-typing their email — the standard "are you sure"
            pattern for irreversible actions. */}
        <Card className="border-red-200">
          <CardHeader className="border-b border-red-100 bg-red-50/50">
            <div>
              <p className="text-xs font-bold text-red-600 uppercase tracking-widest">Danger Zone</p>
              <h2 className="text-lg font-bold text-slate-900">Delete Account</h2>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            <p className="text-sm text-gray-600">
              Permanently delete your account, listings, orders, and conversations.
              This action cannot be undone. The other side of every conversation you
              have will still see the conversation row but with you listed as a
              removed participant.
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmDeleteOpen(true)}
              className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
            >
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Delete-account confirm modal. We gate the destructive
          action on a typed-email match — the form below shows a
          live validation error if the typed value doesn't match
          the session email (case-insensitive, whitespace-
          trimmed). The server action also re-validates the email
          match, so the gate is enforced on both sides. */}
      {confirmDeleteOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-account-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 id="confirm-delete-account-title" className="text-lg font-bold text-slate-900">
              Delete your account permanently?
            </h3>
            <p className="text-sm text-gray-600">
              This will remove your profile, every product you listed, every order
              you placed, and every message you sent. Type your email
              (<span className="font-semibold text-slate-800">{user?.email}</span>)
              to confirm.
            </p>
            {/* `autoComplete="off"` on the parent form suppresses
                Chrome's autofill heuristics for the email-shaped
                input below. Putting it on the form (not the input)
                is the spec-compliant way to opt out: Chrome ignores
                `off` on individual email/password fields, but
                honors it on the wrapping form. The form id is
                unique to this modal so the suppression doesn't
                leak to other forms on the page. */}
            <form
              id="delete-account-confirm-form"
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault();
                void handleDeleteAccount();
              }}
            >
              <Input
                label="Confirm email"
                name="delete-account-confirm"
                value={confirmDeleteEmail}
                onChange={(e) => setConfirmDeleteEmail(e.target.value)}
                placeholder={user?.email ?? ""}
                // `type="text"` (not "email") so the browser doesn't
                // apply email-specific validation or autofill hints
                // to a field whose purpose is "type the same string
                // you see above", not "enter an email address".
                type="text"
                inputMode="email"
                autoComplete="off"
              />
            </form>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setConfirmDeleteOpen(false);
                  setConfirmDeleteEmail("");
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteAccount}
                isLoading={deleting}
                disabled={
                  deleting ||
                  confirmDeleteEmail.trim().toLowerCase() !==
                    (user?.email ?? "").toLowerCase()
                }
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

