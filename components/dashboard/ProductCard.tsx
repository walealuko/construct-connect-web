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
 * Image + name link to the public product page; edit/delete buttons are
 * kept outside the link so their onClick handlers don't bubble.
 */
export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const primary = primaryImage(product);
  const extraCount = Math.max(0, (product.images?.length ?? 0) - 1);
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 flex gap-4 items-center group hover:border-blue-300 transition-all shadow-sm">
      <div className="relative shrink-0">
        <Link href={`/product/${product.id}`} aria-label={`View ${product.name}`}>
          {primary ? (
            <SafeImage
              src={resolveImageUrl(primary, "product-images")}
              alt={product.name}
              width={80}
              height={80}
              className="w-20 h-20 object-cover rounded-lg shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
              No Image
            </div>
          )}
        </Link>
        {extraCount > 0 && (
          <span className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-[10px] font-bold rounded-full w-6 h-6 flex items-center justify-center shadow">
            +{extraCount}
          </span>
        )}
      </div>
      <Link href={`/product/${product.id}`} className="flex-1 min-w-0 hover:text-blue-700">
        <h4 className="font-bold text-slate-900 truncate text-sm">{product.name}</h4>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-blue-600 font-bold text-xs">{formatNaira(product.price)}</p>
          {product.category && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
              {product.category}
            </Badge>
          )}
        </div>
        <p className="text-gray-400 text-[10px] mt-1">Stock: {product.stock}</p>
      </Link>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          onClick={(e) => {
            e.preventDefault();
            onEdit(product);
          }}
          title="Edit Product"
          aria-label="Edit product"
        >
          ✏️
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors"
          onClick={(e) => {
            e.preventDefault();
            onDelete(product.id);
          }}
          title="Delete Product"
          aria-label="Delete product"
        >
          🗑️
        </Button>
      </div>
    </div>
  );
}
