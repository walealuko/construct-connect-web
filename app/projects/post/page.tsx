'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { toast } from "sonner";
import Link from "next/link";

export default function PostProject() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    budget: "",
    category: "",
    deadline: "",
    state: "",
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to post project");
      }

      toast.success("Project posted successfully!");
      router.push("/projects/my-projects");
    } catch (err: any) {
      toast.error(err.message || "Failed to post project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 min-h-[80vh]">
      <div className="max-w-xl mx-auto space-y-8">
        <Link
          href="/dashboard"
          className="text-gray-500 text-sm inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
        >
          ← Back to Dashboard
        </Link>
        <Card className="w-full">
          <CardHeader className="text-center">
            <h2 className="text-3xl font-black text-slate-900">Post a New Project</h2>
            <p className="text-gray-500 text-sm mt-2">Share your project details to attract the best artisans.</p>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <Input
                label="Project Title *"
                placeholder="e.g. Build a 3-bedroom bungalow"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description *</label>
                <textarea
                  placeholder="Describe the project requirements, materials needed, and timeline..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                  rows={4}
                  required
                />
              </div>
              <Input
                label="Budget (Optional)"
                type="number"
                placeholder="Estimated budget in $"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Category"
                  placeholder="e.g. Roofing, Plumbing"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
                <Input
                  label="Deadline (Optional)"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
              <Input
                label="State/Location"
                placeholder="e.g. Lagos"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
              <Button
                type="submit"
                className="w-full py-6 text-lg"
                disabled={loading}
                isLoading={loading}
              >
                Post Project
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

