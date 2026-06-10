"use client";

import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "@/components/UserContext";
import { supabase } from "@/lib/supabase";
import { Project } from "@/types/database";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { updateProjectStatusAction } from "@/app/actions/projects";
import { toast } from "sonner";

export default function MyProjectsPage() {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusModal, setStatusModal] = useState({ isOpen: false, project: null as Project | null });

  useEffect(() => {
    loadProjects();
  }, [user]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err: any) {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!statusModal.project) return;
    setLoading(true);
    try {
      const result = await updateProjectStatusAction(statusModal.project.id, status);
      if (result.success) {
        toast.success(`Project marked as ${status}`);
        setStatusModal({ isOpen: false, project: null });
        loadProjects();
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout userRole="individual">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-900">My Projects</h2>
            <p className="text-gray-500">Manage your posted projects and track their progress.</p>
          </div>
          <Button asChild>
            <Link href="/projects/post">Post New Project</Link>
          </Button>
        </div>

        {loading && projects.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-2xl" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2">
            <div className="py-8 space-y-4">
              <div className="text-4xl">🏗️</div>
              <p className="text-xl text-gray-500">You haven't posted any projects yet.</p>
              <Button asChild>
                <Link href="/projects/post">Post Your First Project</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="p-6 group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{project.title}</h3>
                    <p className="text-xs text-gray-400 uppercase font-bold mt-1">Budget: ${project.budget?.toLocaleString() || 'Negotiable'}</p>
                  </div>
                  <Badge variant={project.status === 'open' ? 'info' : project.status === 'completed' ? 'success' : 'warning'}>
                    {project.status}
                  </Badge>
                </div>
                <p className="text-gray-600 text-sm mb-6 line-clamp-2 leading-relaxed">
                  {project.description}
                </p>
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold">
                    Posted {new Date(project.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link href={`/projects/${project.id}/bids`}>View Bids</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStatusModal({ isOpen: true, project })}
                    >
                      Update Status
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Modal
          isOpen={statusModal.isOpen}
          onClose={() => setStatusModal({ isOpen: false, project: null })}
          title="Update Project Status"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Change the current status of <strong className="text-slate-900">{statusModal.project?.title}</strong>.
            </p>
            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" className="justify-between" onClick={() => handleStatusUpdate('open')}>
                Open <span>🔓</span>
              </Button>
              <Button variant="outline" className="justify-between" onClick={() => handleStatusUpdate('in_progress')}>
                In Progress <span>🛠️</span>
              </Button>
              <Button variant="outline" className="justify-between" onClick={() => handleStatusUpdate('completed')}>
                Completed <span>✅</span>
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
