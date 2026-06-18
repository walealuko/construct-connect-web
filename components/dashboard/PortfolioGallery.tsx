"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import SafeImage from "@/components/ui/SafeImage";
import { Button } from "@/components/ui/Button";
import { resolveImageUrl } from "@/lib/storage";

interface PortfolioGalleryProps {
  items: string[]; // bare storage paths
  loading: boolean;
  onAdd: () => void;
  onRemove: (path: string) => void;
  addLabel?: string;
}

/**
 * Grid of portfolio images. The upload input is hidden — the parent
 * opens it via a ref or document.getElementById, matching the prior UI.
 */
export function PortfolioGallery({
  items,
  loading,
  onAdd,
  onRemove,
  addLabel = "Add Project Image",
}: PortfolioGalleryProps) {
  return (
    <Card>
      <CardContent className="p-6">
        {loading && items.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="text-4xl">🎨</div>
            <p className="text-gray-400 text-sm">
              No project photos yet. Upload images to showcase your expertise!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {items.map((url, i) => (
              <div
                key={`${url}-${i}`}
                className="relative aspect-square rounded-xl overflow-hidden group border border-gray-100 shadow-sm"
              >
                <SafeImage
                  src={resolveImageUrl(url, "artisan-portfolio")}
                  alt="Work"
                  fill
                  className="object-cover group-hover:scale-110 transition-transform"
                />
                <button
                  type="button"
                  onClick={() => onRemove(url)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 text-red-600 text-xs font-bold shadow opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        {/* Always-present hidden trigger — parent calls onAdd to open the file picker */}
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={onAdd} disabled={loading} isLoading={loading}>
            {addLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
