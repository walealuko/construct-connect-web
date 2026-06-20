"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import SafeImage from "@/components/ui/SafeImage";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/components/CartContext";
import { Product, primaryImage } from "@/types/database";
import { toast } from "sonner";
import ProductSkeleton from "./ProductSkeleton";
import { resolveImageUrl } from "@/lib/storage";
import { formatNaira } from "@/lib/format";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "cement", label: "Cement" },
  { value: "bricks", label: "Bricks" },
  { value: "timber", label: "Timber" },
  { value: "tools", label: "Tools" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "paint", label: "Paint" },
  { value: "roofing", label: "Roofing" },
  { value: "flooring", label: "Flooring" },
  { value: "general", label: "General" },
];

export default function MarketplaceClient({ initialProducts }: { initialProducts: Product[] }) {
  const { addToCart, cart } = useCart();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [searchInput, setSearchInput] = useState("");
  const [searchType, setSearchType] = useState("all");
  // City the buyer is shopping from. Used only when sort === "nearest";
  // we promote products whose `location` contains this string to the top.
  // We don't have lat/lng, so case-insensitive substring match on the
  // city text is the closest proxy — sellers/artisans now list a real
  // city on every product (per the form requirement), so this works.
  const [nearestTo, setNearestTo] = useState("");

  // After every load, if the user picked "Nearest to me", promote
  // matching-city products to the top of the visible list. The query
  // itself is unchanged — we just reorder what was returned.
  useEffect(() => {
    if (sort !== "nearest") return;
    const needle = nearestTo.trim().toLowerCase();
    if (!needle) return; // nothing to match — leave the default order
    setProducts((prev) => {
      const matches: Product[] = [];
      const rest: Product[] = [];
      for (const p of prev) {
        const city = (p.location || p.seller_location || "").toLowerCase();
        if (city.includes(needle)) matches.push(p);
        else rest.push(p);
      }
      return [...matches, ...rest];
    });
  }, [sort, nearestTo, loading]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      let query = supabase.from('products').select('*');

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      if (search) {
        if (searchType === "all") {
          query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,location.ilike.%${search}%`);
        } else if (searchType === "name") {
          query = query.ilike('name', `%${search}%`);
        } else if (searchType === "location") {
          query = query.ilike('location', `%${search}%`);
        } else if (searchType === "category") {
          query = query.ilike('category', `%${search}%`);
        }
      }

      if (sort === 'price-asc') {
        query = query.order('price', { ascending: true });
      } else if (sort === 'price-desc') {
        query = query.order('price', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error("Failed to load products:", err);
      toast.error("Failed to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (search !== "" || category !== "all" || sort !== "newest") {
      loadProducts();
    }
  }, [search, category, sort]);

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/buyer-dashboard"
          className="text-gray-500 text-sm inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
        >
          ← Back to Hub
        </Link>
        <div className="flex-1 text-right ml-4">
          <h2 className="text-3xl font-bold text-slate-900 inline-block">
            Marketplace
          </h2>
        </div>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <div className="flex-[2] min-w-[200px] relative flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
            <input
              type="text"
              placeholder="Search materials..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full py-3 pl-10 pr-4 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
            />
          </div>
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="py-3 px-2 rounded-lg border border-gray-300 text-xs bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
          >
            <option value="all">All</option>
            <option value="name">Name</option>
            <option value="location">Location</option>
            <option value="category">Category</option>
          </select>
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="flex-1 min-w-[160px] py-3 px-3.5 rounded-lg border border-gray-300 text-sm bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="flex-1 min-w-[160px] py-3 px-3.5 rounded-lg border border-gray-300 text-sm bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
        >
          <option value="newest">Newest First</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="nearest">Nearest to Me</option>
        </select>

        {sort === "nearest" && (
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">📍</span>
            <input
              type="text"
              placeholder="Your city (e.g., Lagos)"
              value={nearestTo}
              onChange={(e) => setNearestTo(e.target.value)}
              className="w-full py-3 pl-10 pr-4 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
            />
          </div>
        )}

        {(searchInput !== "" || category !== "all" || sort !== "newest" || nearestTo !== "") && (
          <button
            onClick={() => {
              setSearchInput("");
              setSearchType("all");
              setCategory("all");
              setSort("newest");
              setNearestTo("");
            }}
            className="px-3 py-3 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {!loading && (
        <p className="text-gray-500 mb-4 text-sm">
          {products.length} {products.length === 1 ? "product" : "products"} found
          {search && ` for "${search}"`}
          {category !== "all" && ` in ${CATEGORIES.find(c => c.value === category)?.label}`}
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          {[...Array(6)].map((_, i) => <ProductSkeleton key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-4xl mb-2">🔍</p>
          <p className="text-gray-500">No products found. Try adjusting your search or category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          {products.map((product) => {
            const inCart = cart.some((item) => item.id === product.id);
            const primary = primaryImage(product);
            return (
              <div key={product.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <Link href={`/product/${product.id}`} className="block group">
                  <div className="relative">
                    {primary ? (
                      <SafeImage
                        src={resolveImageUrl(primary, 'product-images')}
                        alt={product.name}
                        width={300}
                        height={144}
                        className="w-full h-36 object-cover rounded-lg mb-3 group-hover:opacity-90 transition-opacity"
                      />
                    ) : (
                      <div className="w-full h-36 bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-gray-400 text-2xl">🏗️</div>
                    )}
                    {(product.images?.length ?? 0) > 1 && (
                      <span className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold rounded-full w-6 h-6 flex items-center justify-center shadow">
                        +{product.images.length - 1}
                      </span>
                    )}
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-700 transition-colors">{product.name}</h4>
                </Link>
                <p className="text-gray-500 text-sm mb-2 line-clamp-2 h-10">{product.description || "No description"}</p>
                <p className="text-blue-600 font-bold text-lg mb-1">{formatNaira(product.price)}</p>
                <p className="text-gray-400 text-xs mb-2">
                  {product.seller_name || "Unknown"}
                  {product.seller_location && ` • ${product.seller_location}`}
                </p>
                <div className="flex items-center gap-2">
                  <span className="inline-block bg-blue-50 text-blue-600 text-[10px] uppercase font-bold px-2 py-1 rounded-full">
                    {product.category}
                  </span>
                  <button
                    onClick={() => {
                      addToCart(product);
                      toast.success(`${product.name} added to cart!`);
                    }}
                    disabled={inCart}
                    className={`ml-auto py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                      inCart
                        ? 'bg-blue-200 text-blue-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                    }`}
                  >
                    {inCart ? "In Cart ✓" : "Add to Cart"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

