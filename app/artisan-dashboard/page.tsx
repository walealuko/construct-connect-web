"use client";

import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "@/components/UserContext";
import { supabase } from "@/lib/supabase";
import { Product } from "@/types/database";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Image from "next/image";
import { toast } from "sonner";

export default function ArtisanDashboard() {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    const { data } = await supabase.from('profiles').select('portfolio').eq('id', user?.id).single();
    setPortfolio(data?.portfolio || []);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setLoading(true);
    try {
      const file = e.target.files[0];
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('artisan-portfolio').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('artisan-portfolio').getPublicUrl(fileName);

      const currentPortfolio = [...portfolio, publicUrl];
      await supabase.from('profiles').update({ portfolio: currentPortfolio }).eq('id', user?.id);
      setPortfolio(currentPortfolio);
      toast.success("Portfolio picture uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout userRole="artisan">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-black text-slate-900">Artisan Dashboard</h2>
          <p className="text-gray-500 font-medium">Welcome, {user?.email?.split('@')[0]}!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4">My Profile</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Bio</label>
                  <textarea
                    className="w-full p-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Tell clients about your skills..."
                  />
                </div>
                <button className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all">Save Profile</button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Direct Chat</h3>
              <p className="text-gray-500 text-sm mb-4">Communicate with your clients in real-time.</p>
              <a href="/messages" className="block w-full py-3 text-center bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all">Open Messages</a>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">My Portfolio</h3>
                <label className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all">
                  {loading ? "Uploading..." : "Upload Work"}
                  <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                </label>
              </div>

              {portfolio.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
                  No portfolio images yet. Upload your best work to attract clients!
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {portfolio.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                      <Image src={url} alt="Work" fill className="object-cover group-hover:scale-110 transition-transform" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
