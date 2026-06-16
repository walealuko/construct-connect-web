import { z } from 'zod';

// Registration Schema
export const registerSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  tier: z.enum(['individual', 'business', 'artisan']),
  businessName: z.string().optional(),
  businessType: z.string().optional(),
  location: z.string().min(1, 'Location is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Product Schema
export const productSchema = z.object({
  name: z.string().min(3, 'Product name must be at least 3 characters'),
  description: z.string().min(10, 'Description should be more detailed'),
  price: z.coerce.number().positive('Price must be a positive number'),
  category: z.string().min(1, 'Category is required'),
  stock: z.coerce.number().int().nonnegative('Stock cannot be negative'),
  image_url: z.string().url('Invalid image URL').optional().or(z.literal('')),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type ProductInput = z.infer<typeof productSchema>;
