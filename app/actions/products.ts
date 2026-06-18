"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Schema accepts a bare storage path OR a full URL.
// The dashboard stores bare paths now, but legacy rows may have full URLs.
const ProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.coerce.number().positive("Price must be positive"),
  category: z.string().min(1, "Category is required"),
  stock: z.coerce.number().int().nonnegative("Stock cannot be negative"),
  image_url: z.string().min(1, "Image is required"),
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
      location: profile?.location || "Not specified",
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
    .select('seller_id, image_url')
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

  // Best-effort: remove the image from storage so the bucket doesn't leak.
  // image_url may be a bare path (new uploads) or a full URL (legacy).
  if (product.image_url) {
    const path = extractStoragePath(product.image_url, 'product-images');
    if (path) {
      await supabase.storage.from('product-images').remove([path]);
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
    .select('seller_id, image_url')
    .eq('id', productId)
    .single();

  if (!product || product.seller_id !== user.id) {
    return { success: false, error: "Unauthorized to update this product" };
  }

  // The dashboard may pass a partial form (e.g. description-only edit with
  // no new image). We validate what was sent, but if image_url is empty
  // we keep the existing one.
  const candidate = { ...formData };
  if (!candidate.image_url || candidate.image_url === '') {
    candidate.image_url = product.image_url || '';
  }

  const validated = ProductSchema.safeParse(candidate);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  const { error } = await supabase
    .from('products')
    .update({
      name: validated.data.name,
      description: validated.data.description,
      price: validated.data.price,
      category: validated.data.category,
      stock: validated.data.stock,
      image_url: validated.data.image_url,
    })
    .eq('id', productId);

  if (error) {
    console.error("updateProductAction error:", error);
    return { success: false, error: error.message };
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
