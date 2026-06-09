export interface Profile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  tier: 'admin' | 'business' | 'individual';
  bio?: string;
  location?: string;
  created_at: string;
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

export interface Order {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  total_price: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  role?: string; // Maps to Profile.tier
}
