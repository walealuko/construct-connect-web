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
  );

// Create-project schema used by app/api/projects/route.ts::POST.
// Length caps prevent the route from accepting megabyte-sized
// strings (or XSS payloads) into the projects table. The `state`
// field is free-text but capped — the form's location select sends
// one of 36 Nigerian state names plus FCT, well under 100 chars.
//
// `budget` accepts either a number or numeric string; the client
// posts the form's <input type="number"> value as a string so we
// coerce. `deadline` is an ISO 8601 string that must be in the
// future at validation time.
export const createProjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().min(1, 'Description is required').max(5000, 'Description is too long'),
  budget: z.coerce.number().nonnegative().max(1e12).optional(),
  category: z.string().max(50).optional(),
  deadline: z
    .string()
    .datetime({ message: 'Invalid deadline format' })
    .refine((d) => new Date(d) > new Date(), { message: 'Deadline must be in the future' })
    .optional(),
  state: z.string().max(100).optional(),
});

// Product creation/edit validation lives in `app/actions/products.ts`
// (Zod `ProductSchema`). It owns the `images: string[]` shape since the
// action layer is the source of truth for what's persisted.

export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
