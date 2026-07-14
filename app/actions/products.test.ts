// Mock revalidatePath — same as the auth test. createProductAction
// calls it on the success path, but we don't care about the cache
// side-effect in unit tests.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks for the cookie-bound server client. createProductAction uses:
//   - auth.getUser()    (auth check)
//   - from('profiles').select().eq().maybeSingle()  (seller profile)
//   - from('products').insert().select().single()    (insert + return row)
const mockGetUser = vi.fn();
const mockProfileSelect = vi.fn();
const mockProductInsert = vi.fn();

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: () => mockGetUser() },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => mockProfileSelect(),
            }),
          }),
        };
      }
      if (table === "products") {
        return {
          insert: (...args: unknown[]) => {
            const captured = { table, args };
            const chain = {
              select: () => ({
                single: () => Promise.resolve(mockProductInsert(captured)),
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

import { createProductAction } from "./products";

const validForm = {
  name: "Premium Portland Cement",
  description: "50kg bag, high-strength.",
  price: 6500,
  category: "Building Materials",
  stock: 100,
  location: "Lagos",
  images: ["seed/abc.jpg"],
};

describe("createProductAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "seller-1" } },
      error: null,
    });
    mockProfileSelect.mockResolvedValue({
      data: { business_name: "Apex Construction Supplies", location: "Lagos" },
      error: null,
    });
    mockProductInsert.mockResolvedValue({
      data: {
        id: "new-product-id",
        seller_id: "seller-1",
        name: validForm.name,
        description: validForm.description,
        price: validForm.price,
        category: validForm.category,
        stock: validForm.stock,
        location: validForm.location,
        images: validForm.images,
        seller_name: "Apex Construction Supplies",
        seller_location: "Lagos",
        created_at: new Date().toISOString(),
      },
      error: null,
    });
  });

  it("refuses unauthenticated callers", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const result = await createProductAction(validForm);
    expect(result.success).toBe(false);
    expect(mockProductInsert).not.toHaveBeenCalled();
  });

  it("returns the inserted product on success so callers can optimistically render it", async () => {
    // The dashboard pages use `result.product` to splice the new
    // row into the visible list without a full dashboard re-fetch.
    // A null `product` here would break the optimistic path.
    const result = await createProductAction(validForm);
    expect(result.success).toBe(true);
    // The success branch of the discriminated union carries
    // the created row. Cast at the assertion site.
    const ok = result as Extract<typeof result, { success: true }>;
    expect(ok.product).toBeTruthy();
    expect(ok.product?.id).toBe("new-product-id");
    expect(ok.product?.name).toBe("Premium Portland Cement");
    expect(ok.product?.seller_name).toBe("Apex Construction Supplies");
  });

  it("writes the form's location as seller_location, not the profile's", async () => {
    // The form lets a seller override the city per listing
    // (e.g. stock at a different warehouse). The action must
    // honor the form's value, not fall back to profile.location.
    await createProductAction({ ...validForm, location: "Abuja" });
    const insertCall = mockProductInsert.mock.calls[0][0];
    expect(insertCall.table).toBe("products");
    expect(insertCall.args[0]).toMatchObject({
      seller_location: "Abuja",
      location: "Abuja",
    });
  });

  it("rejects invalid input before touching the database", async () => {
    // Empty name — Zod's ProductSchema requires it.
    const result = await createProductAction({ ...validForm, name: "" });
    expect(result.success).toBe(false);
    expect(mockProductInsert).not.toHaveBeenCalled();
  });

  it("returns success: false when the insert returns no row", async () => {
    // Defense-in-depth: an insert that completes without an
    // error but also without a row would let the dashboard's
    // optimistic splice silently no-op. The action must reject
    // that case so the caller can surface a real error.
    mockProductInsert.mockResolvedValueOnce({ data: null, error: null });
    const result = await createProductAction(validForm);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/not created/i);
    }
  });
});
