import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Project from "@/models/Project";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { title, description, budget } = await req.json();

    if (!title || !description) {
      return NextResponse.json({ message: "Title and description are required" }, { status: 400 });
    }

    const project = await Project.create({
      title,
      description,
      budget,
      userId: (session.user as any).id,
      state: (session.user as any).state, // Use the state from the user session
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const state = searchParams.get("state");

    const filter: any = {};
    if (state) {
      filter.state = state;
    }
    if (filter.status !== undefined) {
        filter.status = 'open'; // Default to open projects
    }

    const projects = await Project.find(filter).populate("userId", "name email").sort({ createdAt: -1 });
    return NextResponse.json(projects);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
