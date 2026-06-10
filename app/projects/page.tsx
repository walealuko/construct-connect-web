"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { toast } from "sonner";

interface Project {
  id: string;
  title: string;
  description: string;
  budget: number | null;
  user_id: string;
  created_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
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

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Available Projects</h1>
          <p className="text-gray-500">Find and bid on construction projects from buyers.</p>
        </div>
        <div className="relative w-64">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading projects...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
          <p className="text-xl text-gray-500">No projects found.</p>
          <p className="text-gray-400">Check back later for new opportunities!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProjects.map((project) => (
            <div key={project.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-slate-900">{project.title}</h3>
                <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-md">
                  ${project.budget?.toLocaleString() || 'Negotiable'}
                </span>
              </div>
              <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
                {project.description}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400 uppercase font-bold">
                  Posted {new Date(project.created_at).toLocaleDateString()}
                </span>
                <Link
                  href={`/messages?project=${project.id}`}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Apply / Message
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
