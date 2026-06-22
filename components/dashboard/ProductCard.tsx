"use client";

import Link from "next/link";
import { Product, primaryImage } from "@/types/database";
import SafeImage from "@/components/ui/SafeImage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { resolveImageUrl } from "@/lib/storage";
import { formatNaira } from "@/lib/format";

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
}

/**
 * One row in the product inventory grid.
 * Pure presentation; the parent owns the edit/delete handlers.
 *
 * Vertical layout (image on top, content below) — the previous
 * horizontal layout squashed everything into a tiny 80×80
 * thumbnail to the left, which made the cards hard to scan
 * when a seller had more than a handful of products. Now the
 * image fills the card width, the product name and price are
 * large, and the edit/delete actions sit underneath on their
 * own row.
 *
 * Image + name link to the public product page; edit/delete
 * buttons are kept outside the link so their onClick handlers
 * don't bubble.
 */
export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const primary = primaryImage(product);
  const extraCount = Math.max(0, (product.images?.length ?? 0) - 1);
  return (
    <div className="bg-white rounded-xl border border-gray-200 flex flex-col group hover:border-blue-300 hover:shadow-md transition-all shadow-sm overflow-hidden">
      <Link
        href={`/product/${product.id}`}
        aria-label={`View ${product.name}`}
        className="block relative"
      >
        {primary ? (
          <SafeImage
            src={resolveImageUrl(primary, "product-images")}
            alt={product.name}
            width={400}
            height={400}
            className="w-full aspect-square object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full aspect-square bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
            No Image
          </div>
        )}
        {extraCount > 0 && (
          <span className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow">
            +{extraCount}
          </span>
        )}
      </Link>

      <div className="flex-1 p-4 flex flex-col gap-3">
        <Link
          href={`/product/${product.id}`}
          className="block hover:text-blue-700"
        >
          <h4 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">
            {product.name}
          </h4>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <p className="text-blue-600 font-bold text-lg">{formatNaira(product.price)}</p>
            {product.category && (
              <Badge variant="outline" className="text-xs">
                {product.category}
              </Badge>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-2">
            <span className="font-semibold text-slate-700">Stock:</span> {product.stock}
          </p>
        </Link>

        <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 font-semibold"
            onClick={(e) => {
              e.preventDefault();
              onEdit(product);
            }}
            title="Edit Product"
            aria-label="Edit product"
          >
            ✏️ Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 font-semibold text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            onClick={(e) => {
              e.preventDefault();
              onDelete(product.id);
            }}
            title="Delete Product"
            aria-label="Delete product"
          >
            🗑️ Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
