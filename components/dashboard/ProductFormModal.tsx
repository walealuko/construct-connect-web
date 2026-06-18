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

interface ProductFormModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  // When editing, pass the existing product. Ignored in add mode.
  product?: Product | null;
  // For artisans, the category is forced to 'artisan-service' and there's
  // no category picker.
  fixedCategory?: string;
  // Submit returns the cleaned payload (image is the bare path, or empty
  // string if no new file was picked). The parent calls the action.
  onSubmit: (data: {
    name: string;
    description: string;
    price: number;
    category: string;
    stock: number;
    image_url: string;
  }) => Promise<void>;
  onClose: () => void;
  // Action button label.
  submitLabel?: string;
}

/**
 * Add/Edit product form. One component for both modes — the differences:
 *   - "required" on the file input (true for add, false for edit)
 *   - submit label ("Save Product" vs "Update Product")
 *   - the image preview shows the existing image when editing without
 *     picking a new one
 *
 * The component handles its own image upload to the bucket, then hands the
 * bare path up via onSubmit. The parent owns the actual create/update.
 */
export function ProductFormModal({
  isOpen,
  mode,
  product,
  fixedCategory,
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset form whenever the modal opens or the product changes.
  useEffect(() => {
    if (!isOpen) return;
    if (isEdit && product) {
      setName(product.name);
      setDescription(product.description);
      setPrice(product.price.toString());
      setCategory(product.category || fixedCategory || PRODUCT_CATEGORIES[0]);
      setStock(product.stock.toString());
      setImageFile(null);
      setImagePreview(resolveImageUrl(product.image_url, "product-images"));
    } else {
      setName("");
      setDescription("");
      setPrice("");
      setCategory(fixedCategory || PRODUCT_CATEGORIES[0]);
      setStock("");
      setImageFile(null);
      setImagePreview("");
    }
  }, [isOpen, isEdit, product, fixedCategory]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      let finalImageUrl = "";
      if (imageFile) {
        const fileName = `${Date.now()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, imageFile, { upsert: true });
        if (uploadError) {
          const hint = uploadError.message?.includes("row-level security")
            ? " Check the RLS policies on the product-images bucket."
            : "";
          throw new Error(`Image upload failed: ${uploadError.message}${hint}`);
        }
        finalImageUrl = fileName;
      } else if (!isEdit) {
        throw new Error("Product image is required");
      }
      // On edit, an empty finalImageUrl tells the parent action to keep
      // the existing image (see updateProductAction).
      await onSubmit({
        name,
        description,
        price: parseFloat(price),
        category,
        stock: parseInt(stock || "0", 10),
        image_url: finalImageUrl,
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
              label="Price ($)"
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

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Product Image {isEdit && <span className="text-gray-300 normal-case font-medium">(optional — leave empty to keep current)</span>}
            </label>
            <div className="flex flex-col gap-3">
              <input
                ref={fileInputRef}
                name="image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required={!isEdit}
              />
              {imagePreview && (
                // blob: URLs (from createObjectURL) are not optimisable by
                // next/image, so we use a plain <img> here. For server URLs
                // resolveImageUrl returns a real URL — still fine.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-32 h-32 rounded-xl object-cover border-2 border-blue-100"
                />
              )}
            </div>
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
