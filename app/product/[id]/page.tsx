import { supabase } from "@/lib/supabase";
import { Product } from "@/types/database";
import Link from "next/link";
import ProductImageGallery from "@/components/ui/ProductImageGallery";
import SellerRating from "@/components/SellerRating";
import ReviewButton from "@/components/ReviewButton";
import ProductAddToCart from "@/components/ProductAddToCart";
import MessageSellerButton from "@/components/MessageSellerButton";
import { formatNaira } from "@/lib/format";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !product) {
    throw new Error("Product not found");
  }

  const p = product as Product;

  return (
    <div className="p-8 pb-24 md:pb-8 max-w-[1100px] mx-auto">
      <Link
        href="/marketplace"
        className="text-gray-500 no-underline text-sm inline-flex items-center gap-1 mb-6 hover:text-blue-700 transition-colors"
      >
        ← Back to Marketplace
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        {/* Left: Image & Seller Info */}
        <div className="space-y-5">
          <ProductImageGallery images={p.images ?? []} alt={p.name} />

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">Sold By</p>
            <p className="text-lg font-bold text-slate-900 mb-1">{p.seller_name || "Unknown Seller"}</p>
            {p.seller_location && (
              <p className="text-sm text-gray-500 mb-3">📍 {p.seller_location}</p>
            )}
            <SellerRating sellerId={p.seller_id} sellerName={p.seller_name} />
            <div className="mt-3 space-y-3">
              <ReviewButton sellerId={p.seller_id} sellerName={p.seller_name} />
              <MessageSellerButton sellerId={p.seller_id} />
            </div>
          </div>
        </div>

        {/* Right: Details */}
        <div className="space-y-6">
          <span className="bg-blue-50 text-blue-600 text-xs px-3 py-1 rounded-full font-bold uppercase">
            {p.category}
          </span>
          <h1 className="text-4xl font-extrabold text-slate-900 leading-tight">
            {p.name}
          </h1>
          <p className="text-4xl font-black text-blue-600">{formatNaira(p.price)}</p>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Stock:</span>
            <strong className={p.stock > 0 ? "text-green-600" : "text-red-600"}>
              {p.stock > 0 ? `${p.stock} available` : "Out of stock"}
            </strong>
          </div>

          <p className="text-gray-600 leading-relaxed">
            {p.description || "No description provided for this product."}
          </p>

          <ProductAddToCart product={p} />

          <div className="p-4 bg-gray-50 rounded-xl flex flex-wrap gap-4 text-xs text-gray-500">
            <span>📦 Ships from: {p.seller_location || "Seller's location"}</span>
            <span>🏷️ Category: <span className="capitalize">{p.category}</span></span>
            <span>🕐 Listed: {new Date(p.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/*
        Mobile-only sticky CTA bar. The product description can
        run long enough that the inline Add-to-Cart and
        Message-Seller buttons end up mid-scroll on phones; the
        buyer reads the description, then has to scroll back up
        to take action. The sticky bar keeps both buttons
        reachable with one tap. Hidden on md+ where the inline
        layout is already discoverable.

        We render an entirely separate copy of the buttons
        rather than repositioning the inline ones, because the
        sticky bar must be a direct child of <body> for `fixed`
        to work cleanly across long pages and to avoid
        `overflow: hidden` ancestors on ancestor containers.
      */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 p-3 flex gap-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="flex-1 [&_button]:w-full">
          <ProductAddToCart product={p} />
        </div>
        <div className="flex-1 [&_button]:w-full">
          <MessageSellerButton sellerId={p.seller_id} />
        </div>
      </div>
    </div>
  );
}
