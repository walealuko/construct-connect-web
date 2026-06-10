"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function PostProject() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    budget: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      setMessage("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setMessage("You must be logged in to post a project");
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("projects")
        .insert({
          title: formData.title,
          description: formData.description,
          budget: formData.budget ? parseInt(formData.budget) : null,
          user_id: user.id,
        });

      if (error) throw error;

      setMessage("Project posted successfully!");
      setTimeout(() => {
        router.push("/marketplace");
      }, 2000);
    } catch (err: any) {
      setMessage(err.message || "Failed to post project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center p-10 min-h-[80vh]">
      <form className="flex flex-col w-full max-w-xl p-8 bg-white rounded-2xl shadow-sm border border-gray-200 gap-5" onSubmit={handleSubmit}>
        <h2 className="text-center text-3xl font-black text-slate-900 mb-2">Post a New Project</h2>

        {message && (
          <p className={`text-center text-sm font-medium ${message.includes("success") ? "text-green-600" : "text-red-600"}`}>
            {message}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700">Project Title *</label>
          <input
            type="text"
            placeholder="e.g. Build a 3-bedroom bungalow"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full p-3 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700">Description *</label>
          <textarea
            placeholder="Describe the project requirements, materials needed, and timeline..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full p-3 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-vertical"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700">Budget (Optional)</label>
          <input
            type="number"
            placeholder="Estimated budget in $"
            value={formData.budget}
            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
            className="w-full p-3 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-all active:scale-95"
        >
          {loading ? "Posting..." : "Post Project"}
        </button>
      </form>
    </div>
  );
}
