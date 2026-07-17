// `useBuyerData` reads from @/lib/supabase, which exports a pre-built
// `supabase` instance. The hook does
// `supabase.from(...).select(...).<chain>(...)` for data, plus
// `supabase.channel(name).on(...).subscribe()` for the realtime
// mirror. We hand-build both shapes here.
//
// The from() dispatcher distinguishes the five tables the hook
// reads: `profiles`, `orders`, `viewed_products`, `conversation_hides`,
// `conversations`. The conversations query uses `.overlaps('participant_ids', [user.id])`,
// which is a chain shape the dashboard-hook test doesn't exercise.

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { UserContext } from "@/components/UserContext";
import { User } from "@/types/database";
import type { Mock } from "vitest";

// Inferred from UserContext's createContext<... | null>(null) — the
// provider expects a UserContextType. We construct a value of that
// shape inline rather than reaching into the module's private type.
type Ctx = Parameters<typeof UserContext.Provider>[0]["value"];

// Captured from `supabase.channel(name).on(...)` so the realtime
// test can fire a synthetic UPDATE through the same callback the
// hook mounted. Without this, the test would need to actually open
// a WebSocket and PostgREST would need to push a real change.
let onOrderUpdate:
  | ((payload: { new: Record<string, unknown>; old?: Record<string, unknown> }) => void)
  | null = null;

type SupabaseMock = {
  profileSelect: Mock<() => Promise<{ data: unknown; error: unknown }>>;
  ordersSelect: Mock<() => Promise<{ data: unknown; error: unknown }>>;
  viewedSelect: Mock<() => Promise<{ data: unknown; error: unknown }>>;
  productsInSelect: Mock<() => Promise<{ data: unknown; error: unknown }>>;
  hidesSelect: Mock<() => Promise<{ data: unknown; error: unknown }>>;
  conversationsSelect: Mock<() => Promise<{ data: unknown; error: unknown }>>;
  participantsSelect: Mock<() => Promise<{ data: unknown; error: unknown }>>;
};

const sb: SupabaseMock = {
  profileSelect: vi.fn(),
  ordersSelect: vi.fn(),
  viewedSelect: vi.fn(),
  productsInSelect: vi.fn(),
  hidesSelect: vi.fn(),
  conversationsSelect: vi.fn(),
  participantsSelect: vi.fn(),
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            // Two distinct call sites in the hook: the page-level
            // profile read uses `.eq('id', ...).maybeSingle()`;
            // the conversation participant lookup uses
            // `.in('id', ...)` with no `eq` in between. We
            // dispatch by the chain method that follows `.eq()`.
            eq: () => ({
              maybeSingle: () => sb.profileSelect(),
            }),
            in: () => sb.participantsSelect(),
          }),
        };
      }
      if (table === "orders") {
        return {
          select: () => ({
            eq: () => ({
              order: () => sb.ordersSelect(),
            }),
          }),
        };
      }
      if (table === "viewed_products") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => sb.viewedSelect(),
              }),
            }),
          }),
        };
      }
      if (table === "products") {
        return {
          select: () => ({
            in: () => sb.productsInSelect(),
          }),
        };
      }
      if (table === "conversation_hides") {
        return {
          select: () => sb.hidesSelect(),
        };
      }
      if (table === "conversations") {
        return {
          select: () => ({
            overlaps: () => ({
              order: () => ({
                limit: () => sb.conversationsSelect(),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
    channel: (_name: string) => {
      // Self-referencing chain. The real supabase client returns a
      // `RealtimeChannel` whose `.on(...)` returns itself so you can
      // chain multiple listeners (e.g. INSERT + UPDATE) before
      // `.subscribe()`. We only need UPDATE for the test, but the
      // shape has to match or the channel errors when the hook
      // chains.
      const chain = {
        on: (
          _event: string,
          _opts: unknown,
          cb: (payload: { new: Record<string, unknown>; old?: Record<string, unknown> }) => void,
        ) => {
          onOrderUpdate = cb;
          return chain;
        },
        subscribe: () => ({}),
      };
      return chain;
    },
    removeChannel: vi.fn(),
  },
}));

// Server actions. The hook awaits these directly, so they need real
// promise-returning mocks. Each test sets the resolved value to
// match its scenario.
vi.mock("@/app/actions/products", () => ({
  removeProductViewAction: vi.fn(),
}));

vi.mock("@/app/actions/orders", () => ({
  deleteOrderAction: vi.fn(),
}));

// The hook calls toast.info on realtime status flips. We don't assert
// on the toast output in the load tests, but the realtime test
// checks that toast.info was called with the new status. Mocking
// the whole module also keeps the sonner side-effecting render path
// out of the test output.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { useBuyerData } from "@/components/dashboard/useBuyerData";
import { removeProductViewAction } from "@/app/actions/products";
import { deleteOrderAction } from "@/app/actions/orders";
import { toast } from "sonner";

type HookResult = ReturnType<typeof useBuyerData>;

let container: HTMLDivElement | undefined;
let root: Root | undefined;
let lastResult: HookResult | undefined;

function makeUser(id = "user-1"): User {
  return { id, email: `${id}@example.com`, role: "individual" };
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
    lastResult = useBuyerData();
    return null;
  }
  await act(async () => {
    root!.render(
      createElement(
        UserContext.Provider,
        { value: makeContextValue(user) },
        createElement(Probe),
      ),
    );
    // Drain the microtask queue so the useEffect-driven load()
    // has a chance to settle before the test reads lastResult.
    // Multiple rounds — the buyer hook's load() chains more
    // awaits than the seller hook (profile, orders, viewed,
    // hides, conversations, participants), so a single
    // Promise.resolve() doesn't always reach the final setState.
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
  });
}

function unmount() {
  if (root) root.unmount();
  if (container?.parentNode) container.parentNode.removeChild(container);
  container = undefined;
  root = undefined;
  lastResult = undefined;
  onOrderUpdate = null;
}

afterEach(async () => {
  // Drain any pending microtasks before tearing down the root, so
  // the unmount doesn't race with a still-firing useEffect (the
  // load effect's chain of awaits can be a few microtasks deep).
  await Promise.resolve();
  unmount();
});

beforeEach(() => {
  vi.clearAllMocks();
  onOrderUpdate = null;
  // Default happy-path mocks. Each test overrides as needed.
  sb.profileSelect.mockResolvedValue({
    data: { id: "user-1", portfolio: [] },
    error: null,
  });
  sb.ordersSelect.mockResolvedValue({ data: [], error: null });
  sb.viewedSelect.mockResolvedValue({ data: [], error: null });
  sb.productsInSelect.mockResolvedValue({ data: [], error: null });
  sb.hidesSelect.mockResolvedValue({ data: [], error: null });
  sb.conversationsSelect.mockResolvedValue({ data: [], error: null });
  sb.participantsSelect.mockResolvedValue({ data: [], error: null });
  (removeProductViewAction as Mock<() => Promise<{ success: boolean; error?: string }>>)
    .mockResolvedValue({ success: true });
  (deleteOrderAction as Mock<() => Promise<{ success: boolean; error?: string }>>)
    .mockResolvedValue({ success: true });
});

describe("useBuyerData — happy path", () => {
  it("reflects the server's data in profile, orders, viewedProducts, and conversations", async () => {
    // The orders array mirrors the rows the orders table returns
    // for the buyer, with `total_price` projected from `total_amount`.
    // The hook does the projection client-side (not a SQL alias)
    // because the buyer-dashboard table renders the rounded number
    // directly. This test pins that projection.
    sb.profileSelect.mockResolvedValue({
      data: { id: "user-1", first_name: "Ada", portfolio: [] },
      error: null,
    });
    sb.ordersSelect.mockResolvedValue({
      data: [
        { id: "o-1", buyer_id: "user-1", status: "completed", total_amount: 4500, created_at: "2026-01-01" },
        { id: "o-2", buyer_id: "user-1", status: "shipped", total_amount: 1200.5, created_at: "2026-01-02" },
        { id: "o-3", buyer_id: "user-1", status: "pending", total_amount: 0, created_at: "2026-01-03" },
      ],
      error: null,
    });
    sb.viewedSelect.mockResolvedValue({
      data: [
        { product_id: "p-1", viewed_at: "2026-01-01" },
        { product_id: "p-2", viewed_at: "2026-01-02" },
      ],
      error: null,
    });
    sb.productsInSelect.mockResolvedValue({
      data: [
        { id: "p-1", name: "Hammer" },
        { id: "p-2", name: "Saw" },
      ],
      error: null,
    });
    // No hides — the inbox preview surfaces everything the
    // conversations query returns.
    sb.hidesSelect.mockResolvedValue({ data: [], error: null });
    sb.conversationsSelect.mockResolvedValue({
      data: [
        {
          id: "c-1",
          participant_ids: ["user-1", "user-2"],
          last_message: "Hello",
          last_message_at: "2026-01-01",
        },
      ],
      error: null,
    });
    sb.participantsSelect.mockResolvedValue({
      data: [{ id: "user-2", first_name: "Bob", last_name: "Smith" }],
      error: null,
    });

    await mountHook(makeUser());

    expect(lastResult?.profile).toMatchObject({ id: "user-1", first_name: "Ada" });
    expect(lastResult?.orders).toHaveLength(3);
    // total_price is `Number(total_amount)` — the integer 4500 stays
    // 4500, the fractional 1200.5 stays 1200.5, the missing 0 stays
    // 0. This is the projection the page's `formatNaira(order.total_price)`
    // call depends on.
    expect(lastResult?.orders[0].total_price).toBe(4500);
    expect(lastResult?.orders[1].total_price).toBe(1200.5);
    expect(lastResult?.orders[2].total_price).toBe(0);
    expect(lastResult?.viewedProducts).toHaveLength(2);
    expect(lastResult?.conversations).toHaveLength(1);
    // The other participant is attached via the two-step fetch
    // (conversations.participant_ids can't be auto-embedded by
    // PostgREST because it's a uuid[]).
    expect(lastResult?.conversations[0].profiles).toHaveLength(1);
    expect(lastResult?.conversations[0].profiles?.[0].id).toBe("user-2");
  });

  it("refresh() re-queries and updates state when the underlying data changes", async () => {
    // First load: empty. Then flip the orders mock to return one
    // order, call refresh(), assert the new row is visible.
    sb.ordersSelect.mockResolvedValueOnce({ data: [], error: null });
    await mountHook(makeUser());
    expect(lastResult?.orders).toHaveLength(0);

    sb.ordersSelect.mockResolvedValue({
      data: [
        { id: "o-new", buyer_id: "user-1", status: "pending", total_amount: 999, created_at: "2026-02-01" },
      ],
      error: null,
    });

    await act(async () => {
      await lastResult!.refresh();
    });

    expect(lastResult?.orders).toHaveLength(1);
    expect(lastResult?.orders[0].id).toBe("o-new");
    expect(lastResult?.orders[0].total_price).toBe(999);
  });

  it("realtime UPDATE on orders mirrors into local state and toasts the status change", async () => {
    // Initial state: one order, status "pending". The realtime test
    // fires a synthetic UPDATE for the same order id with status
    // "shipped" and asserts the local row reflects the change.
    // Without this test, a future "we forgot to flip the badge on
    // seller status change" bug would slip through.
    sb.ordersSelect.mockResolvedValue({
      data: [
        { id: "o-1", buyer_id: "user-1", status: "pending", total_amount: 4500, created_at: "2026-01-01" },
      ],
      error: null,
    });

    await mountHook(makeUser());
    expect(lastResult?.orders[0].status).toBe("pending");

    // The hook's realtime effect should have captured the UPDATE
    // callback by the time `lastResult` is read. If it didn't, the
    // test fails fast here rather than passing silently.
    expect(onOrderUpdate).not.toBeNull();

    act(() => {
      onOrderUpdate!({
        new: {
          id: "o-1",
          buyer_id: "user-1",
          status: "shipped",
          total_amount: 4500,
          created_at: "2026-01-01",
        },
      });
    });

    expect(lastResult?.orders[0].status).toBe("shipped");
    // The toast is the user-facing signal that "your order moved".
    // Pinning the call here so a refactor that drops the toast is
    // caught.
    expect(toast.info).toHaveBeenCalledWith("Order o-1: now shipped");
  });
});
