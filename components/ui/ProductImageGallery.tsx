"use client";

import { useState } from "react";
import { resolveImageUrl } from "@/lib/storage";
import SafeImage from "@/components/ui/SafeImage";

interface ProductImageGalleryProps {
  images: string[];
  alt: string;
  /** Compact mode for cart/order line items — smaller primary, no thumbnail row. */
  compact?: boolean;
}

/**
 * Primary image plus a clickable thumbnail row. Clicking a thumbnail
 * swaps the primary image. Pure presentation; no state lifting needed.
 *
 * - Single image or compact mode: just render the primary at the
 *   requested size, no thumbnail row.
 * - Multiple images, full mode: render the primary large plus a
 *   horizontally-scrollable thumbnail strip.
 * - Empty images: render a placeholder sized for the mode.
 */
export default function ProductImageGallery({
  images,
  alt,
  compact = false,
}: ProductImageGalleryProps) {
  const [active, setActive] = useState(0);

  if (!images || images.length === 0) {
    return compact ? (
      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
        No Image
      </div>
    ) : (
      <div className="w-full h-[360px] bg-gray-100 rounded-2xl flex items-center justify-center text-6xl">
        🏗️
      </div>
    );
  }

  const primary = resolveImageUrl(images[active], "product-images");

  if (compact) {
    return (
      <SafeImage
        src={primary}
        alt={alt}
        width={64}
        height={64}
        className="w-16 h-16 object-cover rounded-lg shadow-sm"
      />
    );
  }

  if (images.length === 1) {
    return (
      <SafeImage
        src={primary}
        alt={alt}
        width={600}
        height={420}
        className="w-full max-h-[420px] object-cover rounded-2xl shadow-lg"
      />
    );
  }

  return (
    <div className="space-y-3">
      <SafeImage
        src={primary}
        alt={alt}
        width={600}
        height={420}
        className="w-full max-h-[420px] object-cover rounded-2xl shadow-lg"
      />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((p, i) => (
          <button
            key={`${i}-${p}`}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`View image ${i + 1}`}
            aria-current={i === active ? "true" : undefined}
            className={`shrink-0 rounded-lg overflow-hidden border-2 transition ${
              i === active
                ? "border-blue-600 ring-2 ring-blue-200"
                : "border-transparent hover:border-gray-300"
            }`}
          >
            <SafeImage
              src={resolveImageUrl(p, "product-images")}
              alt={`${alt} ${i + 1}`}
              width={80}
              height={80}
              className="w-20 h-20 object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}