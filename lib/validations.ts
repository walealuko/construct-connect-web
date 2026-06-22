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
})
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine(
    (data) =>
      data.tier === 'individual' ||
      (typeof data.businessName === 'string' && data.businessName.trim().length >= 2),
    {
      message: 'Business name is required for business and artisan accounts',
      path: ['businessName'],
    }
  )
  .refine(
    (data) =>
      data.tier === 'individual' ||
      (typeof data.businessType === 'string' && data.businessType.length > 0),
    {
      message: 'Business type is required for business and artisan accounts',
      path: ['businessType'],
    }
  );

// Product creation/edit validation lives in `app/actions/products.ts`
// (Zod `ProductSchema`). It owns the `images: string[]` shape since the
// action layer is the source of truth for what's persisted.

export type RegisterInput = z.infer<typeof registerSchema>;
