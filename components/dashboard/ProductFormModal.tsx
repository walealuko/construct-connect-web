"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Product } from "@/types/database";
import { resolveImageUrl } from "@/lib/storage";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export const PRODUCT_CATEGORIES = [
  "General",
  "Tools & Equipment",
  "Building Materials",
  "Heavy Machinery",
  "Electrical & Plumbing",
  "Architectural Services",
  "Interior Design",
  "HVAC",
  "Painting & Finishing",
];

const MAX_IMAGES = 10;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface ProductFormModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  // When editing, pass the existing product. Ignored in add mode.
  product?: Product | null;
  // For artisans, the category is forced to 'artisan-service' and there's
  // no category picker.
  fixedCategory?: string;
  // Pre-fills the Location field. The user can override it per listing
  // (e.g. stock that's actually at a different warehouse). Sellers and
  // artisans must list a city on every product so buyers can sort by
  // proximity.
  defaultLocation?: string | null;
  // Submit returns the cleaned payload. The parent calls the action.
  onSubmit: (data: {
    name: string;
    description: string;
    price: number;
    category: string;
    stock: number;
    location: string;
    images: string[];
  }) => Promise<void>;
  onClose: () => void;
  // Action button label.
  submitLabel?: string;
}

/**
 * Add/Edit product form. One component for both modes — the differences:
 *   - "required" on the file input (true for add, false for edit)
 *   - submit label ("Save Product" vs "Update Product")
 *   - on edit, the picker pre-populates with the existing images and
 *     lets the seller add or remove images freely
 *
 * Up to MAX_IMAGES images per product (10). The component handles its
 * own image uploads to the bucket sequentially, then hands the final
 * bare paths up via onSubmit. The parent owns the actual create/update.
 */
export function ProductFormModal({
  isOpen,
  mode,
  product,
  fixedCategory,
  defaultLocation,
  onSubmit,
  onClose,
  submitLabel,
}: ProductFormModalProps) {
  const isEdit = mode === "edit";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(fixedCategory || PRODUCT_CATEGORIES[0]);
  const [stock, setStock] = useState("");
  // Listing city. Required — buyers search/sort by this, and an empty
  // value hides the product from proximity results.
  const [location, setLocation] = useState("");
  // Existing image paths (edit mode). The user can remove these to
  // delete them from the final array; we collect which were removed
  // for storage cleanup in the parent action.
  const [existingImages, setExistingImages] = useState<string[]>([]);
  // Newly picked files that haven't been uploaded yet (blob previews).
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const totalImages = existingImages.length + newFiles.length;

  // Reset form whenever the modal opens or the product changes.
  useEffect(() => {
    if (!isOpen) return;
    if (isEdit && product) {
      setName(product.name);
      setDescription(product.description);
      setPrice(product.price.toString());
      setCategory(product.category || fixedCategory || PRODUCT_CATEGORIES[0]);
      setStock(product.stock.toString());
      setLocation(product.location || defaultLocation || "");
      setExistingImages(product.images ?? []);
      setNewFiles([]);
      setNewPreviews([]);
    } else {
      setName("");
      setDescription("");
      setPrice("");
      setCategory(fixedCategory || PRODUCT_CATEGORIES[0]);
      setStock("");
      // Pre-fill from the seller's profile so they don't have to type
      // it on every listing. They can override.
      setLocation(defaultLocation || "");
      setExistingImages([]);
      setNewFiles([]);
      setNewPreviews([]);
    }
  }, [isOpen, isEdit, product, fixedCategory, defaultLocation]);

  // Revoke blob URLs when the modal closes to avoid memory leaks.
  useEffect(() => {
    if (!isOpen) {
      newPreviews.forEach((url) => URL.revokeObjectURL(url));
    }
  }, [isOpen, newPreviews]);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-picking the same files
    const accepted: File[] = [];
    const previews: string[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error(`"${file.name}" is not an image`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`"${file.name}" is larger than 5MB`);
        continue;
      }
      accepted.push(file);
      previews.push(URL.createObjectURL(file));
    }
    if (accepted.length === 0) return;

    const room = MAX_IMAGES - totalImages;
    if (room <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} images per product`);
      // Revoke any previews we made but won't use.
      previews.forEach((u) => URL.revokeObjectURL(u));
      return;
    }
    const trimmed = accepted.slice(0, room);
    const trimmedPreviews = previews.slice(0, room);
    if (accepted.length > room) {
      toast.error(`Only ${room} more image${room === 1 ? "" : "s"} allowed (max ${MAX_IMAGES})`);
      // Revoke the unaccepted previews.
      previews.slice(room).forEach((u) => URL.revokeObjectURL(u));
    }
    setNewFiles((prev) => [...prev, ...trimmed]);
    setNewPreviews((prev) => [...prev, ...trimmedPreviews]);
  };

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPreviews((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, file, { upsert: true });
    if (error) {
      const hint = error.message?.includes("row-level security")
        ? " Check the RLS policies on the product-images bucket."
        : "";
      toast.error(`Failed to upload ${file.name}: ${error.message}${hint}`);
      return null;
    }
    return fileName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!location.trim()) {
      // Buyers search and sort by city — a blank location would never
      // surface in their results. Block at the form layer so the seller
      // gets immediate feedback instead of a server round-trip.
      toast.error("Please add the city where this product is located");
      return;
    }
    if (totalImages === 0 && !isEdit) {
      toast.error("Please upload at least one image");
      return;
    }
    setSubmitting(true);
    try {
      // Upload all newly picked files sequentially. Sequential keeps
      // per-file error reporting simple and avoids hammering the bucket.
      const uploadedPaths: string[] = [];
      for (const file of newFiles) {
        const path = await uploadFile(file);
        if (!path) {
          // Abort the whole submission so the form isn't left half-uploaded.
          throw new Error("Image upload failed");
        }
        uploadedPaths.push(path);
      }

      const images = [...existingImages, ...uploadedPaths];
      if (images.length === 0) {
        throw new Error("Product must have at least one image");
      }

      await onSubmit({
        name,
        description,
        price: parseFloat(price),
        category,
        stock: parseInt(stock || "0", 10),
        location: location.trim(),
        images,
      });
    } catch (err: any) {
      toast.error(err.message || `Failed to ${isEdit ? "update" : "add"} product`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Edit Product" : "Add New Product"}>
      <form onSubmit={handleSubmit} className="space-y-5 py-2">
        <div className="space-y-4">
          <Input
            label="Product Name"
            placeholder="e.g., Industrial Concrete Mixer"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Description
            </label>
            <textarea
              name="description"
              placeholder="Describe the features, specifications, and condition..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full p-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price (₦)"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
            <Input
              label="Stock Quantity"
              type="number"
              placeholder="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
            />
          </div>

          {!fixedCategory && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Category
              </label>
              <select
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                required
              >
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Input
              label="Location (City)"
              placeholder="e.g., Lagos, Abuja, Port Harcourt"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
            <p className="text-[11px] text-gray-400">
              Buyers prefer to buy from vendors in their city — keep this accurate.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Product Images ({totalImages}/{MAX_IMAGES})
              {isEdit && <span className="text-gray-300 normal-case font-medium"> — remove any you want gone; pick new ones to add</span>}
            </label>

            {(existingImages.length > 0 || newPreviews.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {existingImages.map((path, i) => (
                  <div key={`existing-${i}-${path}`} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveImageUrl(path, "product-images")}
                      alt={`Existing ${i + 1}`}
                      className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                    />
                    {i === 0 && (
                      <span className="absolute bottom-0 left-0 right-0 text-center bg-blue-600 text-white text-[10px] py-0.5 rounded-b-lg font-bold">
                        Primary
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeExistingImage(i)}
                      className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center shadow"
                      aria-label={`Remove image ${i + 1}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {newPreviews.map((url, i) => (
                  <div key={`new-${i}-${url}`} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`New ${i + 1}`}
                      className="w-20 h-20 rounded-lg object-cover border-2 border-blue-300"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewFile(i)}
                      className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center shadow"
                      aria-label={`Remove pending image ${i + 1}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {totalImages < MAX_IMAGES && (
              <input
                ref={fileInputRef}
                name="images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesChange}
                className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required={!isEdit && totalImages === 0}
              />
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} isLoading={submitting} className="px-8">
            {submitLabel || (isEdit ? "Update Product" : "Save Product")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}