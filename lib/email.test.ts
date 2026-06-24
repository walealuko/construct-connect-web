import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Sink selection depends on env vars. The module reads them at
// call time, so we can set them per test without a full module
// reset — except for the `RESEND_API_KEY` check, which only
// happens once per process. For the Resend-selection test, we use
// `vi.resetModules()` so the module re-evaluates with the new env.
//
// NODE_ENV is typed as the literal union "production" | "development"
// | "test" in @types/node, so direct assignment / `delete` to it is
// rejected by tsc. Same for RESEND_API_KEY being typed `string |
// undefined` only — `delete` against a possibly-undefined property
// is fine, but assigning a literal requires loosening the type.
// The cast to `Record<string, string | undefined>` is the standard
// escape hatch for env-var mutation in tests.
const env = process.env as Record<string, string | undefined>;
const setNodeEnv = (value: string | undefined) => {
  if (value === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = value;
};
const setResendKey = (value: string | undefined) => {
  if (value === undefined) delete env.RESEND_API_KEY;
  else env.RESEND_API_KEY = value;
};

describe("selectSink (sink selection)", () => {
  beforeEach(() => {
    setResendKey(undefined);
  });

  it("returns the Resend sink when RESEND_API_KEY is set", async () => {
    setResendKey("re_test_123");
    setNodeEnv("production");
    vi.resetModules();
    const mod = await import("./email");
    // The Resend sink is the function used when RESEND_API_KEY is
    // present. We test that by setting the key, sending, and
    // checking that no log line was emitted (Resend sink doesn't
    // log success — it only logs failures). Easier: spy on fetch.
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response("ok", { status: 200 }));
    await mod.sendEmail({ to: "a@b.com", subject: "s", html: "<p>x</p>" });
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0][0]).toBe("https://api.resend.com/emails");
    fetchSpy.mockRestore();
  });

  it("returns the noop sink in production without RESEND_API_KEY", async () => {
    setResendKey(undefined);
    setNodeEnv("production");
    vi.resetModules();
    const mod = await import("./email");
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));
    // We can't directly observe the noop sink from outside, so we
    // observe its side-effect: no fetch is made.
    await mod.sendEmail({ to: "a@b.com", subject: "s", html: "<p>x</p>" });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("returns the console sink in dev without RESEND_API_KEY", async () => {
    setResendKey(undefined);
    setNodeEnv("development");
    vi.resetModules();
    const mod = await import("./email");
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));
    // No fetch call should happen in dev — the console sink logs
    // through the structured logger instead. We assert no fetch
    // was made; the actual log assertion is in the logger tests.
    await mod.sendEmail({ to: "a@b.com", subject: "s", html: "<p>x</p>" });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("sendEmail (sink override + failure handling)", () => {
  afterEach(() => {
    // Reset to a clean console sink between tests so the override
    // doesn't leak. The restore function from __setEmailSinkForTests
    // also works; this is belt-and-suspenders.
    vi.resetModules();
  });

  it("dispatches to the active sink", async () => {
    vi.resetModules();
    const mod = await import("./email");
    const sink = vi.fn(async () => {});
    const restore = mod.__setEmailSinkForTests(sink);
    try {
      await mod.sendEmail({ to: "a@b.com", subject: "hi", html: "<p>x</p>" });
      expect(sink).toHaveBeenCalledOnce();
      // vi.fn() infers an empty-tuple args signature from a no-arg
      // arrow, so mock.calls[0] is typed as `[]` and indexing [0]
      // fails under strict tsc. Widen through `unknown` first to
      // escape the empty-tuple error, then cast to the message
      // shape we passed in. Same shape as the `Extract<...>` casts
      // used in auth.test.ts for discriminated-union narrowing.
      const calledWith = sink.mock.calls[0] as unknown as [
        { to: string; subject: string; html: string },
      ];
      expect(calledWith[0]).toEqual({ to: "a@b.com", subject: "hi", html: "<p>x</p>" });
    } finally {
      restore();
    }
  });

  it("does not throw when the sink rejects (sink must swallow errors)", async () => {
    vi.resetModules();
    const mod = await import("./email");
    const restore = mod.__setEmailSinkForTests(async () => {
      throw new Error("provider down");
    });
    try {
      await expect(
        mod.sendEmail({ to: "a@b.com", subject: "hi", html: "<p>x</p>" }),
      ).resolves.toBeUndefined();
    } finally {
      restore();
    }
  });
});

describe("email templates", () => {
  it("orderPlacedEmail: subject includes the order id, body includes the buyer name and total", async () => {
    const { orderPlacedEmail } = await import("./email-templates");
    const out = orderPlacedEmail({
      buyerName: "Ada",
      orderId: "ord_abc",
      items: [{ name: "Cement", quantity: 2, price: 5000 }],
      total: 10000,
    });
    expect(out.subject).toContain("ord_abc");
    expect(out.html).toContain("Ada");
    expect(out.html).toContain("Cement");
    // The formatted total — we use en-NG, so 10000 → "10,000.00".
    expect(out.html).toContain("10,000.00");
  });

  it("orderPlacedEmail: HTML-escapes user input to block injection", async () => {
    const { orderPlacedEmail } = await import("./email-templates");
    const out = orderPlacedEmail({
      buyerName: "<script>alert(1)</script>",
      orderId: "ord_x",
      items: [{ name: "Cement & Sand", quantity: 1, price: 100 }],
      total: 100,
    });
    // The escaped form should be in the body; the raw form should
    // not appear as raw HTML (we check that "<script>" doesn't
    // appear unescaped in the body, which it would if we just
    // string-concatenated the input).
    expect(out.html).toContain("&lt;script&gt;");
    expect(out.html).not.toContain("<script>alert(1)</script>");
  });

  it("orderReceivedBySellerEmail: subject includes order id, body includes product and amount", async () => {
    const { orderReceivedBySellerEmail } = await import("./email-templates");
    const out = orderReceivedBySellerEmail({
      sellerName: "Bola",
      orderId: "ord_42",
      productName: "Roofing sheet",
      quantity: 4,
      amount: 24000,
      buyerName: "Chinedu",
    });
    expect(out.subject).toContain("ord_42");
    expect(out.html).toContain("Bola");
    expect(out.html).toContain("Roofing sheet");
    expect(out.html).toContain("Chinedu");
    expect(out.html).toContain("24,000.00");
  });

  it("orderStatusChangedEmail: subject includes order id and status, body includes buyer name", async () => {
    const { orderStatusChangedEmail } = await import("./email-templates");
    const out = orderStatusChangedEmail({
      buyerName: "Ada",
      orderId: "ord_99",
      status: "shipped",
    });
    expect(out.subject).toContain("ord_99");
    expect(out.subject.toLowerCase()).toContain("shipped");
    expect(out.html).toContain("Ada");
    expect(out.html).toContain("Shipped"); // capitalized status in body
  });

  it("messageReceivedEmail: subject includes the sender name, body includes the preview text", async () => {
    const { messageReceivedEmail } = await import("./email-templates");
    const out = messageReceivedEmail({
      recipientName: "Ada",
      senderName: "Bola",
      preview: "Is the cement still in stock?",
      conversationId: "conv_123",
    });
    expect(out.subject).toContain("Bola");
    expect(out.html).toContain("Ada");
    expect(out.html).toContain("Is the cement still in stock?");
    expect(out.html).toContain("conv_123");
  });
});
