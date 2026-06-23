// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock @supabase/ssr so the proxy doesn't hit a real Supabase
// server during tests. createServerClient returns a fake client
// whose auth.getUser resolves to a controllable value.
const mockGetUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  })),
}));

// env vars must be set before the proxy file is loaded (it reads
// process.env at call-time, not import-time, so this is just
// defensive).
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

// Import after mocks. vi.resetModules() is called per test so the
// rate-limit Map is fresh — otherwise the second test sees the
// first test's bucket.
async function freshProxy() {
  vi.resetModules();
  const mod = await import("./proxy");
  // Also re-import rateLimit so its module-level Map is fresh.
  const rl = await import("./lib/rateLimit");
  rl.__resetForTests();
  return mod.proxy;
}

function makeReq(pathname: string, ip: string): NextRequest {
  return new NextRequest(`https://example.com${pathname}`, {
    method: "GET",
    headers: { "x-forwarded-for": ip },
  });
}

function makePostReq(pathname: string, ip: string): NextRequest {
  return new NextRequest(`https://example.com${pathname}`, {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
}

describe("proxy — rate limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: anonymous user. Tests can override.
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  it("allows the first 5 /login requests from the same IP", async () => {
    const proxy = await freshProxy();
    for (let i = 0; i < 5; i++) {
      const res = await proxy(makeReq("/login", "1.2.3.4"));
      expect(res.status).not.toBe(429);
    }
  });

  it("returns 429 on the 6th /login request from the same IP", async () => {
    const proxy = await freshProxy();
    for (let i = 0; i < 5; i++) {
      await proxy(makeReq("/login", "1.2.3.4"));
    }
    const sixth = await proxy(makeReq("/login", "1.2.3.4"));
    expect(sixth.status).toBe(429);
    // The 429 response should include a retry-after header.
    expect(sixth.headers.get("retry-after")).toBe("60");
  });

  it("rate-limits /register too", async () => {
    const proxy = await freshProxy();
    for (let i = 0; i < 5; i++) {
      await proxy(makeReq("/register", "5.6.7.8"));
    }
    const sixth = await proxy(makeReq("/register", "5.6.7.8"));
    expect(sixth.status).toBe(429);
  });

  it("treats different IPs as independent buckets", async () => {
    const proxy = await freshProxy();
    for (let i = 0; i < 5; i++) {
      await proxy(makeReq("/login", "9.9.9.9"));
    }
    // Different IP — fresh bucket.
    const fresh = await proxy(makeReq("/login", "9.9.9.10"));
    expect(fresh.status).not.toBe(429);
  });

  it("does NOT rate-limit other paths", async () => {
    const proxy = await freshProxy();
    // Hit /marketplace 10 times from the same IP — none should 429.
    for (let i = 0; i < 10; i++) {
      const res = await proxy(makeReq("/marketplace", "11.11.11.11"));
      expect(res.status).not.toBe(429);
    }
  });

  it("rate-limits POST /api/payments/initialize", async () => {
    const proxy = await freshProxy();
    for (let i = 0; i < 10; i++) {
      await proxy(makePostReq("/api/payments/initialize", "12.12.12.12"));
    }
    const eleventh = await proxy(
      makePostReq("/api/payments/initialize", "12.12.12.12"),
    );
    expect(eleventh.status).toBe(429);
  });

  it("does NOT rate-limit GET /api/payments/initialize (only POST counts)", async () => {
    const proxy = await freshProxy();
    // GETs should never trip the pay:* bucket.
    for (let i = 0; i < 12; i++) {
      const res = await proxy(makeReq("/api/payments/initialize", "13.13.13.13"));
      expect(res.status).not.toBe(429);
    }
  });
});