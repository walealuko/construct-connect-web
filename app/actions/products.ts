"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const MAX_IMAGES = 10;

// `images` accepts an array of bare storage paths. The form layer enforces
// the 1–10 count; the DB enforces the same via check constraints.
const ProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.coerce.number().positive("Price must be positive"),
  category: z.string().min(1, "Category is required"),
  stock: z.coerce.number().int().nonnegative("Stock cannot be negative"),
  // Sellers and artisans must list a city on every product. Buyers search
  // and sort by this field, so an empty value would mean "Not specified"
  // forever and hide the listing from proximity searches.
  location: z.string().min(1, "Location is required"),
  images: z
    .array(z.string().min(1))
    .min(1, "At least one image is required")
    .max(MAX_IMAGES, `Up to ${MAX_IMAGES} images`),
});

export type ProductInput = z.infer<typeof ProductSchema>;

export async function createProductAction(formData: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized to create product" };
  }

  const validated = ProductSchema.safeParse(formData);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  // Fetch seller's profile to get business details for the product record
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('business_name, location')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Error fetching seller profile:", profileError);
  }

  const { error } = await supabase
    .from('products')
    .insert({
      seller_id: user.id,
      seller_name: profile?.business_name || "Unknown Seller",
      // seller_location mirrors location so the marketplace card label
      // ("Product Name • Lagos") has the data it needs without a join.
      // The form's location is the source of truth; profile.location
      // is only a fallback for legacy callers.
      seller_location: validated.data.location || profile?.location || undefined,
      ...validated.data,
    });

  if (error) {
    console.error("createProductAction insert error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath('/seller-dashboard');
  revalidatePath('/artisan-dashboard');
  revalidatePath('/marketplace');

  return { success: true };
}

export async function deleteProductAction(productId: string) {
  const supabase = await createClient();

  const { data: product } = await supabase
    .from('products')
    .select('seller_id, images')
    .eq('id', productId)
    .single();

  if (!product) {
    return { success: false, error: "Product not found" };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || product.seller_id !== user.id) {
    return { success: false, error: "Unauthorized to delete this product" };
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) return { success: false, error: error.message };

  // Best-effort: remove every image from storage so the bucket doesn't
  // leak. Each entry may be a bare path (new uploads) or a full URL
  // (legacy rows); extractStoragePath handles both.
  if (Array.isArray(product.images)) {
    const paths = (product.images as string[])
      .map((p) => extractStoragePath(p, 'product-images'))
      .filter((p): p is string => !!p);
    if (paths.length > 0) {
      await supabase.storage.from('product-images').remove(paths);
    }
  }

  revalidatePath('/seller-dashboard');
  revalidatePath('/artisan-dashboard');
  revalidatePath('/marketplace');

  return { success: true };
}

export async function removeProductViewAction(productId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  const { error } = await supabase
    .from('viewed_products')
    .delete()
    .eq('user_id', user.id)
    .eq('product_id', productId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/buyer-dashboard');

  return { success: true };
}

export async function updateProductAction(productId: string, formData: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized to update product" };
  }

  const { data: product } = await supabase
    .from('products')
    .select('seller_id, images')
    .eq('id', productId)
    .single();

  if (!product || product.seller_id !== user.id) {
    return { success: false, error: "Unauthorized to update this product" };
  }

  // The form may pass a partial payload (e.g. metadata-only edit with
  // no image changes). We validate what was sent. If `images` is empty,
  // null, or not an array, we keep the existing array.
  const candidate = { ...formData };
  const hasNewImages = Array.isArray(candidate.images) && candidate.images.length > 0;
  if (!hasNewImages) {
    candidate.images = (product.images as string[]) ?? [];
  }

  const validated = ProductSchema.safeParse(candidate);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  // Track which old paths are no longer in the new array — clean those
  // up from storage so the bucket doesn't leak. Only relevant when the
  // form actually sent a new images array.
  let removedPaths: string[] = [];
  if (hasNewImages && Array.isArray(product.images)) {
    const oldSet = new Set(product.images as string[]);
    removedPaths = (product.images as string[])
      .filter((p) => !validated.data.images.includes(p))
      .map((p) => extractStoragePath(p, 'product-images'))
      .filter((p): p is string => !!p);
    // best-effort: ignore the size — we just want to know which to remove
    void oldSet;
  }

  const { error } = await supabase
    .from('products')
    .update({
      name: validated.data.name,
      description: validated.data.description,
      price: validated.data.price,
      category: validated.data.category,
      stock: validated.data.stock,
      location: validated.data.location,
      seller_location: validated.data.location,
      images: validated.data.images,
    })
    .eq('id', productId);

  if (error) {
    console.error("updateProductAction error:", error);
    return { success: false, error: error.message };
  }

  // Best-effort cleanup of removed images. Failure here is non-fatal —
  // the DB row is already correct.
  if (removedPaths.length > 0) {
    await supabase.storage.from('product-images').remove(removedPaths);
  }

  revalidatePath('/seller-dashboard');
  revalidatePath('/artisan-dashboard');
  revalidatePath('/marketplace');

  return { success: true };
}

export async function verifyStockAction(items: { productId: string; quantity: number }[]) {
  const supabase = await createClient();

  for (const item of items) {
    const { data: product, error } = await supabase
      .from('products')
      .select('name, stock')
      .eq('id', item.productId)
      .single();

    if (error || !product) {
      return { success: false, error: `Product ${item.productId} not found` };
    }

    if (product.stock < item.quantity) {
      return { success: false, error: `Insufficient stock for ${product.name}. Only ${product.stock} left.` };
    }
  }

  return { success: true };
}

/**
 * Extract a storage path from either a bare path or a full Supabase Storage URL.
 * Returns null if the URL belongs to a different bucket or isn't a Supabase URL.
 */
function extractStoragePath(value: string, bucket: string): string | null {
  if (!value) return null;
  // Already a bare path
  if (!/^https?:\/\//i.test(value)) return value;

  try {
    const url = new URL(value);
    // Match /storage/v1/object/(public|sign)/<bucket>/<path>
    const m = url.pathname.match(new RegExp(`/storage/v1/object/(?:public|sign)/${bucket}/(.+)$`));
    return m ? m[1] : null;
  } catch {
    return null;
  }
}
