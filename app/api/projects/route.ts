import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { take } from "@/lib/rateLimit";
import { createProjectSchema } from "@/lib/validations";

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch projects";
    console.error("Fetch projects error: - route.ts:28", error);
    return NextResponse.json(
      { message },
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

    // Rate limit per-user. A malicious signed-in client could otherwise
    // spam inserts. 5/min is well above the legitimate "I'm iterating on
    // a draft" ceiling and well below the rate at which a bot would
    // notice it's not being throttled.
    if (!take(`create-project:${user.id}`, 5, 60_000)) {
      return NextResponse.json(
        { message: "Too many project submissions. Please try again in a minute." },
        { status: 429 }
      );
    }

    const body = await req.json();

    // Zod-validate the body. The schema caps title/description/state
    // length and requires a future deadline. Returning the first
    // issue's message keeps the error contract simple for the
    // post-project form.
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json(
        { message: first?.message ?? "Invalid project payload" },
        { status: 400 }
      );
    }

    const { title, description, budget, category, deadline, state } = parsed.data;

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
        budget: budget ?? 0,
        category: category || "",
        deadline: deadline ? new Date(deadline).toISOString() : null,
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create project";
    console.error("Create project error: - route.ts:122", error);

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}
