export interface Profile {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  business_name?: string;
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

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  total_price: number;
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
