import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import MarketplaceClient from "@/components/MarketplaceClient";
import { Product } from "@/types/database";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Marketplace - Construction Materials | Construct Hub",
  description:
    "Browse construction materials from verified sellers. Cement, steel, blocks, roofing, plumbing, electrical — buy by location, weight, and grade.",
};

export default async function MarketplacePage() {
  // Fetch initial products on the server for SEO and speed.
  // Cap at 60 to match the client-side loadProducts limit. Without
  // this cap the server would pull 1000 rows (PostgREST default)
  // and ship them as the page's initial payload, then the client
  // would fetch another 60 on mount. A busy category with 5000
  // products would render the first 1000 server-side, then the
  // client would re-fetch the most recent 60 — visibly different
  // result sets.
  const { data: initialProducts, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(60);

  if (error) {
    console.error("Error fetching initial products:", error);
    // We let the error boundary handle critical errors,
    // but we can pass an empty array as fallback.
  }

  return <MarketplaceClient initialProducts={(initialProducts as Product[]) || []} />;
}

