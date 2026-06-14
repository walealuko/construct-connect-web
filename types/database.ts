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
  image_url?: string;
  stock: number;
  seller_id: string;
  seller_name: string;
  seller_location?: string;
  location: string;
  created_at: string;
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

export interface OrderItem {
  product_id: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  user_id: string;
  total_price: number;
  status: 'pending' | 'completed' | 'cancelled' | 'shipped' | 'delivered';
  created_at: string;
  items: OrderItem[];
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
