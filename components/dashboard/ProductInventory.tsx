"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProductCard } from "@/components/dashboard/ProductCard";
import type { Product } from "@/types/database";

interface ProductInventoryProps {
  products: Product[];
  loading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
}

/**
 * Seller / artisan "Product Inventory" section: a search box on
 * top of the product grid. Filtering is client-side over the
 * already-loaded page because the parent paginates server-side
 * and an in-memory filter on 10-30 rows is instant — no DB
 * round-trip per keystroke. The search matches name +
 * description (case-insensitive substring), so a seller with 200
 * products can find one to edit in 1-2 keystrokes.
 *
 * The empty state has three branches:
 *   1. Loading + 0 products → skeleton grid.
 *   2. 0 products in the DB → "no products yet" CTA.
 *   3. 0 products after filtering → "no matches for {q}".
 */
export function ProductInventory({
  products,
  loading,
  onEdit,
  onDelete,
}: ProductInventoryProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const name = p.name?.toLowerCase() ?? "";
      const desc = p.description?.toLowerCase() ?? "";
      return name.includes(q) || desc.includes(q);
    });
  }, [products, query]);

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        {/*
          Search bar — hidden entirely when there are no products
          and we're not loading, so the empty CTA stays clean.
          A clear button (×) inside the input drops the filter
          and re-focuses the input.
        */}
        {products.length > 0 && (
          <div className="relative">
            <span
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none"
              aria-hidden="true"
            >
              🔍
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${products.length} ${products.length === 1 ? "product" : "products"}…`}
              aria-label="Search products by name or description"
              className="w-full py-2.5 pl-10 pr-10 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 text-sm font-bold"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {loading && products.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-72 w-full rounded-xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="text-4xl">📦</div>
            <p className="text-gray-400 text-sm">
              No products listed yet. Start by adding your first product!
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="text-4xl">🔍</div>
            <p className="text-gray-400 text-sm">
              No products match &ldquo;{query}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-xs font-bold uppercase tracking-wider text-blue-600 hover:text-blue-800"
            >
              Clear search
            </button>
          </div>
        ) : (
          <>
            {query && (
              <p className="text-xs text-gray-400">
                Showing {filtered.length} of {products.length} product
                {products.length === 1 ? "" : "s"}
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
