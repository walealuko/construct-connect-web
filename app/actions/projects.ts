"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const BidSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  amount: z.number().positive("Bid amount must be positive"),
  proposal: z.string().min(10, "Proposal must be at least 10 characters long"),
});

export async function submitBidAction(formData: any) {
  const supabase = await createClient();

  // 1. Validate inputs
  const validated = BidSchema.safeParse(formData);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be logged in to submit a bid" };
  }

  // 2. Insert Bid
  const { error } = await supabase
    .from('bids')
    .insert({
      project_id: validated.data.projectId,
      user_id: user.id,
      amount: validated.data.amount,
      proposal: validated.data.proposal,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/projects');
  revalidatePath('/projects/post');

  return { success: true };
}

export async function updateProjectStatusAction(projectId: string, status: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in to update project status" };
  }

  // 1. Verify ownership
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .single();

  if (fetchError || !project) {
    return { success: false, error: "Project not found" };
  }

  if (project.user_id !== user.id) {
    return { success: false, error: "You do not have permission to update this project" };
  }

  // 2. Update status
  const { error } = await supabase
    .from('projects')
    .update({ status })
    .eq('id', projectId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/projects');
  return { success: true };
}
