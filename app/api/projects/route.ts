import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(req.url);
    const state = searchParams.get("state");

    let query = supabase
      .from("projects")
      .select("*, profiles(first_name, last_name, email)")
      .eq("status", "open");

    if (state) {
      query = query.eq("state", state);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Fetch projects error: - route.ts:28", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Authentication check
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      title,
      description,
      budget,
      category,
      deadline,
      state,
    } = body;

    // Validation
    if (!title?.trim()) {
      return NextResponse.json(
        { message: "Title is required" },
        { status: 400 }
      );
    }

    if (!description?.trim()) {
      return NextResponse.json(
        { message: "Description is required" },
        { status: 400 }
      );
    }

    // Fetch user state from profile if not provided in body
    let userState = state;
    if (!userState) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('location')
        .eq('id', user.id)
        .single();
      userState = profile?.location || "";
    }

    const { data: project, error: insertError } = await supabase
      .from("projects")
      .insert({
        title: title.trim(),
        description: description.trim(),
        budget: budget || 0,
        category: category || "",
        deadline: deadline || null,
        user_id: user.id,
        state: userState,
        status: "open",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Populate user info for the response
    const { data: populatedUser } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();

    return NextResponse.json(
      {
        success: true,
        project: {
          ...project,
          user: populatedUser,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create project error: - route.ts:122", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create project",
      },
      { status: 500 }
    );
  }
}
