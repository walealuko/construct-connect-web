"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Profile } from "@/types/database";

export default function PublicProfile() {
  const params = useParams();
  const id = params.id;
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPublicProfile = async () => {
      try {
        const { data, error: supabaseError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (supabaseError) throw supabaseError;
        setUser(data);
      } catch (err: any) {
        console.error("Error fetching public profile:", err);
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPublicProfile();
    }
  }, [id]);

  if (loading) return (
    <div className="text-center p-16 text-gray-500">
      Loading profile...
    </div>
  );

  if (error) return (
    <div className="text-center p-16">
      <p className="text-red-600 text-xl font-bold mb-4">{error}</p>
      <Link href="/marketplace" className="text-blue-600 font-semibold hover:underline">
        Back to Marketplace
      </Link>
    </div>
  );

  return (
    <div className="p-8 max-w-3xl mx-auto font-sans">
      <Link href="/marketplace" className="text-gray-500 text-sm inline-flex items-center gap-1 mb-6 hover:text-blue-600 transition-colors">
        ← Back to Marketplace
      </Link>

      <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-4xl border border-gray-200">
            👤
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 m-0">
              {`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Unknown User'}
            </h1>
            <p className="text-gray-500 text-lg m-0">
              {user?.tier === "business" ? "Verified Seller" : "Member"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
            <h3 className="text-xs text-gray-400 uppercase font-bold mb-2">About</h3>
            <p className="text-gray-700 leading-relaxed m-0">
              {user?.bio || "No bio provided."}
            </p>
          </div>

          <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
            <h3 className="text-xs text-gray-400 uppercase font-bold mb-2">Details</h3>
            <div className="flex flex-col gap-2">
              <p className="m-0 text-gray-700">
                <strong className="text-gray-500">Business:</strong> {user?.business_name || "N/A"}
              </p>
              <p className="m-0 text-gray-700">
                <strong className="text-gray-500">Location:</strong> {user?.location || "Not specified"}
              </p>
              <p className="m-0 text-gray-700">
                <strong className="text-gray-500">Joined:</strong> {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
