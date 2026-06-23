import type { MetadataRoute } from "next";

/**
 * robots.txt. Allow everything by default; explicitly disallow the
 * dashboard, admin, and any private routes so well-behaved crawlers
 * don't index them.
 *
 * The sitemap URL is rendered with the same SITE_URL fallback as
 * sitemap.ts so the two are always in sync.
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin*",
          "/dashboard",
          "/buyer-dashboard",
          "/seller-dashboard",
          "/artisan-dashboard",
          "/messages",
          "/cart",
          "/checkout",
          "/profile/edit",
          "/projects/post",
          "/projects/my-projects",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
