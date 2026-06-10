"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/components/CartContext";
import { Product } from "@/types/database";
import { toast } from "sonner";
import ProductSkeleton from "./ProductSkeleton";

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
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,location.ilike.%${search}%`);
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
      <h2 className="text-3xl font-bold text-slate-900 mb-6">
        Marketplace
      </h2>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="flex-[2] min-w-[200px] relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
          <input
            type="text"
            placeholder="Search by product name, type, or location..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full py-3 pl-10 pr-4 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
          />
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
        </select>
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
            return (
              <div key={product.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <Link href={`/product/${product.id}`} className="block group">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      width={300}
                      height={144}
                      className="w-full h-36 object-cover rounded-lg mb-3 group-hover:opacity-90 transition-opacity"
                    />
                  ) : (
                    <div className="w-full h-36 bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-gray-400 text-2xl">🏗️</div>
                  )}
                  <h4 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-700 transition-colors">{product.name}</h4>
                </Link>
                <p className="text-gray-500 text-sm mb-2 line-clamp-2 h-10">{product.description || "No description"}</p>
                <p className="text-blue-600 font-bold text-lg mb-1">${product.price?.toFixed(2)}</p>
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
