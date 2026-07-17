import { describe, expect, it } from "vitest";
import { savedSearchMatchEmail, templates } from "@/lib/email-templates";

describe("savedSearchMatchEmail", () => {
  it("produces a subject that quotes the search name", () => {
    const { subject } = savedSearchMatchEmail({
      recipientName: "Ada",
      searchName: "Roofing jobs in Lagos",
      project: {
        id: "p-1",
        title: "Re-roof 4-bed in Ikeja",
        description: "Strip the old roofing sheets and replace.",
        budget: 850_000,
        state: "Lagos",
        category: "Roofing",
        created_at: "2026-07-01T00:00:00Z",
      },
    });
    // The subject is the primary reason the user opens the email;
    // it must include the search name verbatim.
    expect(subject).toContain("Roofing jobs in Lagos");
  });

  it("embeds the project title and a link to the project detail page", () => {
    const { html } = savedSearchMatchEmail({
      recipientName: "Ada",
      searchName: "Roofing jobs in Lagos",
      project: {
        id: "p-99",
        title: "Re-roof 4-bed in Ikeja",
        description: "Strip the old roofing sheets and replace.",
        budget: 850_000,
        state: "Lagos",
        category: "Roofing",
        created_at: "2026-07-01T00:00:00Z",
      },
    });
    expect(html).toContain("Re-roof 4-bed in Ikeja");
    expect(html).toContain('href="/projects/p-99"');
  });

  it("escapes HTML in the project title and recipient name", () => {
    // A malicious project poster could try to inject markup via the
    // title. The template must escape `&`, `<`, `>`, `"`, and `'`.
    const { html } = savedSearchMatchEmail({
      recipientName: "Ada & <script>",
      searchName: 'Quotes "test"',
      project: {
        id: "p-1",
        title: "5&1 <strong>rooms</strong> in 'Lekki'",
        description: "Plain description.",
        budget: null,
        state: null,
        category: null,
        created_at: "2026-07-01T00:00:00Z",
      },
    });
    expect(html).toContain("5&amp;1 &lt;strong&gt;rooms&lt;/strong&gt; in &#39;Lekki&#39;");
    // The recipient name should be escaped too, not the raw
    // script tag.
    expect(html).not.toContain("<script>");
  });

  it("omits the location and category rows when they're null", () => {
    // The template renders the location/category as optional rows.
    // When the project row doesn't have them (e.g. the Edge
    // Function fetches a project that was created before
    // category/state were added), the rows should not render.
    const { html } = savedSearchMatchEmail({
      recipientName: "Ada",
      searchName: "Anything",
      project: {
        id: "p-1",
        title: "Anything",
        description: "x",
        budget: null,
        state: null,
        category: null,
        created_at: "2026-07-01T00:00:00Z",
      },
    });
    expect(html).not.toContain("Location");
    expect(html).not.toContain("Category");
  });

  it("is exposed on the templates namespace", () => {
    // The tests below rely on the function being accessible via
    // `templates.savedSearchMatchEmail(...)` so the action layer
    // can do `import { templates } from ...`. Pin the surface.
    expect(typeof templates.savedSearchMatchEmail).toBe("function");
  });
});
