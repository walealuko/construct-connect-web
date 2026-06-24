import React, { useEffect } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  /**
   * Footer slot. Sticks to the bottom of the drawer and stays in
   * view as the form scrolls. Pass action buttons (Cancel / Save).
   * If omitted, no footer is rendered.
   */
  footer?: React.ReactNode;
  /**
   * Drawer width. Defaults to a comfortable 560px which is what
   * the product form was tuned for. Smaller forms can pass `sm`
   * (420px) for a tighter feel.
   */
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES: Record<NonNullable<DrawerProps["size"]>, string> = {
  sm: "max-w-[420px]",
  md: "max-w-[560px]",
  lg: "max-w-[720px]",
};

/**
 * Right-side slide-in panel. Use for forms that have many fields
 * (Add Product, Edit Product, large multi-step forms). For short
 * confirm dialogs and bid-input popovers, prefer the centered
 * `Modal` — they read better as small alert dialogs than as a
 * 500px side panel.
 *
 * Behavior:
 *   - Slides in from the right edge with a fade backdrop.
 *   - Locks body scroll while open so the page behind doesn't
 *     scroll under the drawer.
 *   - Esc closes. Backdrop click closes.
 *   - Renders nothing when closed — no DOM footprint, no ARIA
 *     noise for screen readers.
 *
 * Animation: matches the existing `Modal` convention with
 * `animate-in fade-in` / `slide-in-from-right` classes. The
 * tailwindcss-animate plugin isn't currently installed; the
 * classes are present so the drawer will animate when/if the
 * plugin is added without further code changes.
 */
export const Drawer = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: DrawerProps) => {
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Lock body scroll. Same pattern as the existing Modal; the
    // unlock runs in the cleanup so navigating away from the page
    // (e.g. parent re-renders with isOpen=false) doesn't leave
    // the body permanently un-scrollable.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Right-side panel. Click events on the panel stop
          propagation so clicks inside the form don't dismiss the
          drawer. Same shape as the existing Modal's onClick
          pattern. */}
      <div
        className={cn(
          "ml-auto h-full w-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300",
          SIZE_CLASSES[size],
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start gap-4 flex-shrink-0">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              {description && (
                <p className="text-sm text-gray-500">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors flex-shrink-0"
            >
              <span aria-hidden="true" className="text-lg leading-none">✕</span>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {footer && (
          <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
