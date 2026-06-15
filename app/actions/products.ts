"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.number().positive("Price must be positive"),
  category: z.string().min(1, "Category is required"),
  stock: z.number().int().nonnegative("Stock cannot be negative"),
  image_url: z.string().url("A valid image URL is required"),
});

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
    .single();

  if (profileError) {
    console.error("Error fetching seller profile:", profileError);
    // We continue but with defaults if profile is missing
  }

  const { error } = await supabase
    .from('products')
    .insert({
      seller_id: user.id,
      seller_name: profile?.business_name || "Unknown Seller",
      location: profile?.location || "Not specified",
      ...validated.data,
    });

  if (error) return { success: false, error: error.message };

  revalidatePath('/seller-dashboard');
  revalidatePath('/artisan-dashboard');
  revalidatePath('/marketplace');

  return { success: true };
}

export async function deleteProductAction(productId: string) {
  const supabase = await createClient();

  const { data: product } = await supabase
    .from('products')
    .select('seller_id')
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
