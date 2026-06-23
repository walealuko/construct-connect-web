import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

/**
 * Sitemap. Lists the static public pages + every product and artisan
 * profile in the database. Crawlers will hit this; the response is
 * cached by Next at the edge for the duration returned below.
 *
 * Auth-gated routes (dashboards, cart, checkout, messages) are
 * intentionally omitted — they aren't useful to crawlers and would
 * leak route shape.
 *
 * `NEXT_PUBLIC_SITE_URL` is the canonical base (e.g. https://constructhub.ng).
 * Falls back to a localhost URL so the build works in dev.
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static public routes. Listed at a fixed `lastModified` so the
  // sitemap response is stable — Next can cache it aggressively.
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/marketplace`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/artisans`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/projects`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/register`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Dynamic: products and artisan profiles. Both are public; both
  // change frequently enough that a daily crawl is the right ceiling.
  // Failures here are non-fatal — if the DB is down we still return
  // the static routes.
  let dynamic: MetadataRoute.Sitemap = [];
  try {
    const [products, artisans] = await Promise.all([
      supabase.from("products").select("id, updated_at").limit(1000),
      supabase.from("profiles").select("id, updated_at").eq("role", "artisan").limit(1000),
    ]);

    if (products.data) {
      for (const p of products.data) {
        dynamic.push({
          url: `${SITE_URL}/product/${p.id}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : now,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
    if (artisans.data) {
      for (const a of artisans.data) {
        dynamic.push({
          url: `${SITE_URL}/artisans/${a.id}`,
          lastModified: a.updated_at ? new Date(a.updated_at) : now,
          changeFrequency: "monthly",
          priority: 0.5,
        });
      }
    }
  } catch {
    // Swallowed — static routes are still useful even if dynamic failed.
  }

  return [...staticRoutes, ...dynamic];
}
