"use client";

import { Button } from "@/components/ui/Button";

interface PaginationProps {
  page: number; // 1-indexed
  pageCount: number;
  totalCount: number; // for "Showing 1-10 of 247"
  pageSize: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

/**
 * Simple Prev / page-x-of-y / Next pagination.
 * Renders nothing if there's only one page.
 */
export function Pagination({
  page,
  pageCount,
  totalCount,
  pageSize,
  onPageChange,
  loading,
}: PaginationProps) {
  if (pageCount <= 1) {
    return totalCount > 0 ? (
      <p className="text-xs text-gray-400 text-center pt-2">
        Showing {totalCount} of {totalCount}
      </p>
    ) : null;
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);
  const canPrev = page > 1;
  const canNext = page < pageCount;

  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
      <p className="text-xs text-gray-500">
        Showing <span className="font-bold text-slate-700">{start}–{end}</span> of{" "}
        <span className="font-bold text-slate-700">{totalCount}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev || loading}
        >
          ← Prev
        </Button>
        <span className="text-xs text-gray-500 font-medium px-2">
          Page {page} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext || loading}
        >
          Next →
        </Button>
      </div>
    </div>
  );
}
