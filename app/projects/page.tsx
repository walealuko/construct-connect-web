"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { submitBidAction } from "@/app/actions/projects";

interface Project {
  id: string;
  title: string;
  description: string;
  budget: number | null;
  user_id: string;
  created_at: string;
  status: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bidModal, setBidModal] = useState({ isOpen: false, project: null as Project | null });
  const [bidForm, setBidForm] = useState({ amount: "", proposal: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err: any) {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bidModal.project) return;

    setSubmitting(true);
    try {
      const result = await submitBidAction({
        projectId: bidModal.project.id,
        amount: parseFloat(bidForm.amount),
        proposal: bidForm.proposal,
      });

      if (result.success) {
        toast.success("Bid submitted successfully!");
        setBidModal({ isOpen: false, project: null });
        setBidForm({ amount: "", proposal: "" });
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit bid");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900">Available Projects</h1>
          <p className="text-gray-500">Find and bid on construction projects from buyers.</p>
        </div>
        <div className="relative w-full md:w-64">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <div className="py-8 space-y-4">
            <div className="text-4xl">🏗️</div>
            <p className="text-xl text-gray-500">No projects found.</p>
            <p className="text-gray-400">Check back later for new opportunities!</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="p-6 hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {project.title}
                </h3>
                <Badge variant="info">
                  ${project.budget?.toLocaleString() || 'Negotiable'}
                </Badge>
              </div>
              <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
                {project.description}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400 uppercase font-bold">
                  Posted {new Date(project.created_at).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    asChild
                  >
                    <Link href={`/messages?project=${project.id}`}>Message</Link>
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setBidModal({ isOpen: true, project })}
                  >
                    Submit Bid
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={bidModal.isOpen}
        onClose={() => setBidModal({ isOpen: false, project: null })}
        title="Submit Your Bid"
      >
        <form onSubmit={handleBidSubmit} className="space-y-4">
          <p className="text-sm text-slate-600 mb-4">
            You are bidding on <strong>{bidModal.project?.title}</strong>.
            Provide your best estimate and a brief proposal.
          </p>
          <Input
            type="number"
            placeholder="Your Bid Amount ($)"
            value={bidForm.amount}
            onChange={(e) => setBidForm({ ...bidForm, amount: e.target.value })}
            required
          />
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Proposal</label>
            <textarea
              placeholder="Explain your approach, timeline, and expertise..."
              value={bidForm.proposal}
              onChange={(e) => setBidForm({ ...bidForm, proposal: e.target.value })}
              className="w-full p-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-600"
              rows={4}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" size="sm" onClick={() => setBidModal({ isOpen: false, project: null })}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={submitting}
              isLoading={submitting}
            >
              Submit Proposal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
