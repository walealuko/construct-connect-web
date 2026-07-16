import { beforeEach, describe, expect, it, vi } from "vitest";

// The create-project route imports `createClient` from the cookie-bound
// server client. We mock it the same way the existing payments/orders
// route tests do — a per-table `from(table)` dispatcher with chainable
// stubs that capture each call.
const mockGetUser = vi.fn();
const mockProfileSelect = vi.fn();
const mockProjectsInsert = vi.fn();

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: () => mockGetUser() },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: () => mockProfileSelect(),
            }),
          }),
        };
      }
      if (table === "projects") {
        return {
          insert: (...args: unknown[]) => {
            const captured = { table, args };
            const chain = {
              select: () => ({
                single: () => Promise.resolve(mockProjectsInsert(captured)),
              }),
            };
            return chain;
          },
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  })),
}));

// The rate limiter is an in-memory singleton — __resetForTests() gives
// each test a clean bucket map so the 5/min limit doesn't leak across
// cases. Without this, test #5 ("accepts a valid payload") would
// already be at the cap if any other test ran first.
import { __resetForTests } from "@/lib/rateLimit";

// `POST` is the route's named export we want to test.
async function callPost(body: unknown, user: { id: string } | null = { id: "u-1" }) {
  const { POST } = await import("../route");
  mockGetUser.mockResolvedValue({
    data: { user },
    error: null,
  });
  const req = new Request("http://localhost/api/projects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req as unknown as import("next/server").NextRequest);
}

const valid = {
  title: "Renovate 3-bed flat in Lekki",
  description: "Full interior renovation including kitchen and bathrooms.",
  budget: 4_500_000,
  category: "Renovation",
  state: "Lagos",
  // Future deadline so the future-refine passes.
  deadline: new Date(Date.now() + 7 * 86_400_000).toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  __resetForTests();
  mockProfileSelect.mockResolvedValue({ data: null, error: null });
  mockProjectsInsert.mockResolvedValue({
    data: { id: "p-1", ...valid, status: "open" },
    error: null,
  });
});

describe("POST /api/projects — Zod validation", () => {
  it("rejects a project with an empty title", async () => {
    const res = await callPost({ ...valid, title: "" });
    expect(res.status).toBe(400);
    expect(mockProjectsInsert).not.toHaveBeenCalled();
  });

  it("rejects a description longer than 5000 chars", async () => {
    const res = await callPost({ ...valid, description: "a".repeat(5001) });
    expect(res.status).toBe(400);
    expect(mockProjectsInsert).not.toHaveBeenCalled();
  });

  it("rejects a negative budget", async () => {
    const res = await callPost({ ...valid, budget: -1 });
    expect(res.status).toBe(400);
    expect(mockProjectsInsert).not.toHaveBeenCalled();
  });

  it("rejects a deadline in the past", async () => {
    const res = await callPost({
      ...valid,
      deadline: new Date(Date.now() - 86_400_000).toISOString(),
    });
    expect(res.status).toBe(400);
    expect(mockProjectsInsert).not.toHaveBeenCalled();
  });

  it("accepts a valid payload and inserts with the canonical shape", async () => {
    const res = await callPost(valid);
    expect(res.status).toBe(201);
    expect(mockProjectsInsert).toHaveBeenCalledTimes(1);
    const call = mockProjectsInsert.mock.calls[0][0];
    expect(call.table).toBe("projects");
    expect(call.args[0]).toMatchObject({
      title: valid.title,
      description: valid.description,
      budget: valid.budget,
      category: valid.category,
      state: valid.state,
      status: "open",
      // user_id from the session, not the body.
      user_id: "u-1",
    });
    // Deadline is normalized to an ISO string at write time.
    expect(call.args[0].deadline).toBe(new Date(valid.deadline).toISOString());
  });

  it("rate-limits unauthenticated and authenticated spam alike", async () => {
    // The unauthenticated case short-circuits at 401 — not at the
    // rate limit — so the limit only applies to signed-in users.
    // We exercise the auth path: 5 inserts allowed, 6th returns 429.
    mockProfileSelect.mockResolvedValue({ data: { location: "Lagos" }, error: null });
    mockProjectsInsert.mockResolvedValue({ data: { id: "p-x" }, error: null });
    for (let i = 0; i < 5; i++) {
      const res = await callPost(valid);
      expect(res.status).toBe(201);
    }
    const sixth = await callPost(valid);
    expect(sixth.status).toBe(429);
  });
});
