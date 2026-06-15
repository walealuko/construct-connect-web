'use client';

import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '@/components/UserContext';
import { updateProfile } from '@/app/actions/user';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { toast } from 'sonner';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function EditProfilePage() {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      } catch (err: any) {
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
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
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
                />
                <Input
                  label="Last Name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
                <Input
                  label="Location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={3}
                  className="w-full p-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Tell the community about yourself..."
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
                  />
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Business Type</label>
                    <select
                      name="business_type"
                      value={formData.business_type}
                      onChange={handleChange}
                      className="w-full p-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-600"
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
      </div>
    </div>
  );
}

