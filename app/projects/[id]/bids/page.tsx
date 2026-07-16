"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatNaira } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Profile } from "@/types/database";

interface Bid {
  id: string;
  user_id: string;
  amount: number;
  proposal: string;
  created_at: string;
  profiles?: Profile;
}

export default function ProjectBidsPage() {
  const { id: projectId } = useParams();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    loadBids();
  }, [projectId]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const loadBids = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bids')
        .select(`
          *,
          profiles:user_id (*)
        `)
        .eq('project_id', projectId)
        .order('amount', { ascending: true });

      if (error) throw error;
      setBids(data || []);
    } catch {
      toast.error("Failed to load bids");
    } finally {
      setLoading(false);
    }
  };

  const acceptBid = async (bidId: string) => {
    setLoading(true);
    try {
      // 1. Update project status to in_progress
      const { error: pError } = await supabase
        .from('projects')
        .update({ status: 'in_progress' })
        .eq('id', projectId);
      if (pError) throw pError;

      // 2. Mark bid as accepted (assuming a 'status' column exists in bids)
      const { error: bError } = await supabase
        .from('bids')
        .update({ status: 'accepted' })
        .eq('id', bidId);
      if (bError) throw bError;

      toast.success("Bid accepted! The artisan has been notified.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to accept bid";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout userRole="individual">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-black text-slate-900">Project Bids</h2>
          <Badge variant="info">Project ID: {projectId?.slice(0,8)}...</Badge>
        </div>

        {loading && bids.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-2xl" />
            ))}
          </div>
        ) : bids.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2">
            <div className="py-8 space-y-4">
              <div className="text-4xl">📑</div>
              <p className="text-xl text-gray-500">No bids received yet.</p>
              <p className="text-gray-400">Wait for artisans to discover your project and submit proposals!</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bids.map((bid) => (
              <Card key={bid.id} className="p-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {bid.profiles?.first_name?.[0] || 'A'}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">
                          {bid.profiles?.first_name} {bid.profiles?.last_name}
                        </h3>
                        <p className="text-xs text-gray-400">Artisan</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-blue-600">{formatNaira(bid.amount)}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Bid Amount</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-sm text-gray-600 leading-relaxed italic">
                      "{bid.proposal}"
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold">
                    Submitted {new Date(bid.created_at).toLocaleDateString()}
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => acceptBid(bid.id)}
                  >
                    Accept Bid
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
