// Mock revalidatePath. updateOrderStatusAction calls it on the
// success path; we don't care about the cache side-effect in
// hook tests.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { UserContext } from "@/components/UserContext";
import { User } from "@/types/database";

// Inferred from UserContext's createContext<... | null>(null) — the
// provider expects a UserContextType. We construct a value of that
// shape inline rather than reaching into the module's private type.
type Ctx = Parameters<typeof UserContext.Provider>[0]["value"];

import type { Mock } from "vitest";

type SupabaseMock = {
  profileSelect: Mock<() => Promise<{ data: unknown; error: unknown }>>;
  productsIdSelect: Mock<() => Promise<{ data: unknown; error: unknown }>>;
  productsPageSelect: Mock<() => Promise<{ data: unknown; count: number; error: unknown }>>;
  orderCountSelect: Mock<() => Promise<{ count: number; error: unknown }>>;
  orderItemsSelect: Mock<() => Promise<{ data: unknown; error: unknown }>>;
  profileUpsert: Mock<(...args: unknown[]) => Promise<{ error: unknown }>>;
};

const sb: SupabaseMock = {
  profileSelect: vi.fn(),
  productsIdSelect: vi.fn(),
  productsPageSelect: vi.fn(),
  orderCountSelect: vi.fn(),
  orderItemsSelect: vi.fn(),
  profileUpsert: vi.fn(),
};

// `useDashboardData` reads from @/lib/supabase, which exports a
// pre-built `supabase` instance. The hook does
// `supabase.from(...).select(...).eq(...)` chains. We hand-build the
// same chain shape the products action test uses, dispatching by
// table name. The two product queries are distinguished by the
// second arg (`count: "exact"`) the hook passes to `.select()`.
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => sb.profileSelect(),
            }),
          }),
          // The hook's addPortfolioItems / removePortfolioItem
          // await the upsert promise directly — the chain is just
          // `.upsert(data, { onConflict: "id" })`.
          upsert: (...args: unknown[]) => sb.profileUpsert(...args),
        };
      }
      if (table === "products") {
        return {
          select: (_cols: string, opts?: { count?: string }) => {
            if (opts?.count === "exact") {
              return {
                eq: () => ({
                  order: () => ({
                    range: () => sb.productsPageSelect(),
                  }),
                }),
              };
            }
            return {
              eq: () => sb.productsIdSelect(),
            };
          },
        };
      }
      if (table === "order_items") {
        return {
          select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return {
                in: () => sb.orderCountSelect(),
              };
            }
            return {
              in: () => ({
                range: () => ({
                  order: () => sb.orderItemsSelect(),
                }),
              }),
            };
          },
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  },
}));

// Mock the order status action — the hook calls it on update, but
// our tests don't exercise that path.
vi.mock("@/app/actions/orders", () => ({
  updateOrderStatusAction: vi.fn(async () => ({ success: true })),
}));

import { useDashboardData } from "@/components/dashboard/useDashboardData";

type HookResult = ReturnType<typeof useDashboardData>;

let container: HTMLDivElement | undefined;
let root: Root | undefined;
let lastResult: HookResult | undefined;

function makeUser(id = "user-1"): User {
  return { id, email: `${id}@example.com`, role: "artisan" };
}

function makeContextValue(user: User | null): Ctx {
  return {
    user,
    setUser: vi.fn(),
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  };
}

async function mountHook(user: User | null) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  function Probe() {
    lastResult = useDashboardData();
    return null;
  }
  await act(async () => {
    root!.render(
      createElement(
        UserContext.Provider,
        { value: makeContextValue(user) },
        createElement(Probe)
      )
    );
    // Drain the microtask queue so the useEffect-driven load()
    // has a chance to settle before the test reads lastResult.
    await Promise.resolve();
  });
}

function unmount() {
  if (root) root.unmount();
  if (container?.parentNode) container.parentNode.removeChild(container);
  container = undefined;
  root = undefined;
  lastResult = undefined;
}

afterEach(() => {
  unmount();
});

beforeEach(() => {
  vi.clearAllMocks();
  // Default happy-path mocks. Each test overrides as needed.
  sb.profileSelect.mockResolvedValue({
    data: { id: "user-1", portfolio: [] },
    error: null,
  });
  sb.productsIdSelect.mockResolvedValue({ data: [], error: null });
  sb.productsPageSelect.mockResolvedValue({ data: [], count: 0, error: null });
  sb.orderCountSelect.mockResolvedValue({ count: 0, error: null });
  sb.orderItemsSelect.mockResolvedValue({ data: [], error: null });
  sb.profileUpsert.mockResolvedValue({ error: null });
});

describe("useDashboardData — happy path", () => {
  it("reflects the server's exact product count in products, productCount, and stats", async () => {
    // The recent "create doesn't show in inventory" bug went
    // undiagnosed because no test pinned the load() →
    // setProducts/setProductCount/setStats roundtrip. This test
    // asserts that for a range of counts.
    for (const n of [0, 1, 11]) {
      sb.productsIdSelect.mockResolvedValue({
        data: Array.from({ length: n }, (_, i) => ({ id: `p-${i}` })),
        error: null,
      });
      sb.productsPageSelect.mockResolvedValue({
        data: Array.from({ length: Math.min(n, 10) }, (_, i) => ({
          id: `p-${i}`,
          name: `Product ${i}`,
          seller_id: "user-1",
        })),
        count: n,
        error: null,
      });
      sb.orderCountSelect.mockResolvedValue({ count: 0, error: null });
      sb.orderItemsSelect.mockResolvedValue({ data: [], error: null });

      await mountHook(makeUser());

      // Page size is 10 — 0 returns nothing on the page, 1 returns
      // 1, 11 returns 10 (capped at the page size).
      const expectedOnPage = Math.min(n, 10);
      expect(lastResult?.products).toHaveLength(expectedOnPage);
      expect(lastResult?.productCount).toBe(n);
      expect(lastResult?.stats.productsCount).toBe(n);

      unmount();
    }
  });

  it("refresh() re-queries and updates state when the underlying data changes", async () => {
    // First load: empty. Then flip the mock to return one
    // product, call refresh(), assert the new row is visible
    // and the counts bumped to 1.
    sb.productsIdSelect.mockResolvedValueOnce({ data: [], error: null });
    sb.productsPageSelect.mockResolvedValueOnce({
      data: [],
      count: 0,
      error: null,
    });
    await mountHook(makeUser());
    expect(lastResult?.products).toHaveLength(0);
    expect(lastResult?.productCount).toBe(0);
    expect(lastResult?.stats.productsCount).toBe(0);

    // Flip the mock to return one product on the next call.
    sb.productsIdSelect.mockResolvedValueOnce({
      data: [{ id: "p-new" }],
      error: null,
    });
    sb.productsPageSelect.mockResolvedValueOnce({
      data: [{ id: "p-new", name: "New Product", seller_id: "user-1" }],
      count: 1,
      error: null,
    });

    await act(async () => {
      await lastResult!.refresh();
    });

    expect(lastResult?.products).toHaveLength(1);
    expect(lastResult?.products[0].id).toBe("p-new");
    expect(lastResult?.productCount).toBe(1);
    expect(lastResult?.stats.productsCount).toBe(1);
  });
});
