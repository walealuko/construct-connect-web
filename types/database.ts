export interface Profile {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  business_name?: string;
  avatar_url?: string;
  tier: 'admin' | 'business' | 'individual' | 'artisan';
  bio?: string;
  location?: string;
  state?: string;
  created_at: string;
  portfolio?: string[];
}

export interface ViewedProduct {
  id: string;
  user_id: string;
  product_id: string;
  viewed_at: string;
}

export interface Artisan {
  id: string;
  name: string;
  category: string;
  skills: string[];
  rate: string;
  image: string;
  location: string;
  bio: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  // Paths into the `product-images` bucket. The first element is the
  // primary image displayed in cards/marketplace. Up to 10 entries.
  images: string[];
  stock: number;
  seller_id: string;
  seller_name: string;
  seller_location?: string;
  location: string;
  created_at: string;
}

/** Primary image path for a product, or '' if it has none. */
export function primaryImage(p: Pick<Product, "images">): string {
  return p.images?.[0] ?? "";
}

export interface Project {
  id: string;
  title: string;
  description: string;
  budget: number | null;
  user_id: string;
  status: 'open' | 'in_progress' | 'completed';
  created_at: string;
}

export interface CartItem extends Product {
  quantity: number;
}

/**
 * One row in the server-side cart (cart_items table). Only the
 * product id and quantity live on the server — the rest of the
 * product fields are joined in at read time by the server action
 * that returns a fully-populated CartItem.
 */
export interface CartItemRow {
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  product_id: string;
  order_id: string;
  quantity: number;
}

export interface Order {
  id: string;
  buyer_id: string;
  // Total at the time the order was placed. The DB has this column
  // NOT NULL on the orders table (regenerated from the live schema
  // in types/supabase.ts), so the checkout flow must compute and
  // persist a value here. We deliberately keep it as a snapshot
  // rather than re-deriving from order_items on every read — that
  // way the row is self-contained even if a line item is later
  // edited or removed.
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled' | 'shipped' | 'delivered';
  created_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
}

export interface User {
  id: string;
  email: string;
  role?: string; // Maps to Profile.tier
}
