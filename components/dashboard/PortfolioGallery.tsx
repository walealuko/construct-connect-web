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
  // Soft cap so an artisan can't grow this gallery unbounded. The
  // upload handler is responsible for hard-rejecting past this count;
  // the gallery just hides the Add button when full.
  maxItems?: number;
  /**
   * In-flight uploads shown as data: URL previews. We render these
   * alongside the existing storage items so the user gets instant
   * feedback after picking files, instead of staring at a spinner
   * for the full upload duration. Each preview carries a stable id
   * the parent uses to drop the entry once the real URL lands (or
   * on upload failure). The id is opaque to this component — we
   * only echo it back via `onRemovePending`.
   */
  pendingPreviews?: { id: string; src: string }[];
  onRemovePending?: (id: string) => void;
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
  maxItems = 24,
  pendingPreviews = [],
  onRemovePending,
}: PortfolioGalleryProps) {
  return (
    <Card>
      <CardContent className="p-6">
        {loading && items.length === 0 && pendingPreviews.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 && pendingPreviews.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="text-4xl">🎨</div>
            <p className="text-gray-400 text-sm">
              No project photos yet. Upload images to showcase your expertise!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/*
              Pending previews render first so they appear at the top
              of the grid while uploads are in flight. Using <img>
              (not SafeImage) because data: URLs can't be optimized
              and SafeImage's loading-error fallback would mask a
              genuine read failure. We disable the linter rule that
              would otherwise flag the raw <img>.
            */}
            {pendingPreviews.map((p) => (
              <div
                key={p.id}
                className="relative aspect-square rounded-xl overflow-hidden group border-2 border-blue-300 shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.src}
                  alt="Uploading"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0 left-0 right-0 text-center bg-blue-600/90 text-white text-[10px] py-0.5 font-bold tracking-wider uppercase">
                  Uploading…
                </span>
                {onRemovePending && (
                  <button
                    type="button"
                    onClick={() => onRemovePending(p.id)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 text-red-600 text-xs font-bold shadow opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                    aria-label="Remove pending upload"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
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
          <Button size="sm" onClick={onAdd} disabled={items.length >= maxItems}>
            {addLabel}{items.length >= maxItems ? ` (${maxItems} max)` : ""}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
