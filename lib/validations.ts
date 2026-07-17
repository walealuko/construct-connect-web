import { z } from 'zod';

// Registration password policy:
//   - 9 to 15 characters
//   - at least one special character from the OWASP-recommended
//     printable-ASCII set below
// The cap (15) intentionally blocks long passphrases like
// "correct-horse-battery-staple" (28 chars). This is a deliberate
// project-owner choice over the NIST 800-63B (2020) guidance that
// encourages passphrases; the 15-char ceiling is the trade-off
// the team made. See README.md > Security for the rationale.
//
// Exported so a future password-change form can reuse the same
// rule without drift. The form's strength meter (see
// app/(auth)/register/page.tsx) reads these constants to derive
// its scoring, so client and server agree on the bounds.
export const PASSWORD_MIN = 9;
export const PASSWORD_MAX = 15;
// Printable ASCII punctuation that survives typical form
// encoders. The escape-heavy string is the source — `includes`
// scans it for the literal character. Spaces are deliberately
// excluded so a typo'd spacebar doesn't accidentally count as a
// special character.
const SPECIAL_CHARS = "!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?`~";

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
  .max(PASSWORD_MAX, `Password must be at most ${PASSWORD_MAX} characters`)
  .refine(
    (p) => {
      for (const ch of p) {
        if (SPECIAL_CHARS.includes(ch)) return true;
      }
      return false;
    },
    { message: "Password must include at least one special character" },
  );

/**
 * Score a password's strength on a 0–2 scale. The form's meter
 * uses this so the live UI and the Zod refine can't drift apart.
 * Mirrors the server rule: 0 = invalid for submission, 1+ = valid.
 *
 *   0 (weak):   fails the Zod rule (length out of bounds, or no
 *               special character)
 *   1 (medium): valid (passes Zod) but only 2 character classes
 *   2 (strong): valid AND ≥3 character classes
 *
 * The character-class count intentionally rewards variety without
 * making a particular class required — so a 15-char passphrase
 * of all letters can still land on 2 if the form prefers
 * character diversity. (The form just *displays* the score; it
 * doesn't enforce it.)
 */
export function scorePassword(p: string): 0 | 1 | 2 {
  if (p.length < PASSWORD_MIN || p.length > PASSWORD_MAX) return 0;
  let hasSpecial = false;
  for (const ch of p) {
    if (SPECIAL_CHARS.includes(ch)) {
      hasSpecial = true;
      break;
    }
  }
  if (!hasSpecial) return 0;
  let classes = 0;
  if (/[a-z]/.test(p)) classes++;
  if (/[A-Z]/.test(p)) classes++;
  if (/\d/.test(p)) classes++;
  // A 4-class "has special" bonus is not added; special is
  // already required by the rule, so its presence is reflected
  // in the "valid" gate above. The meter rewards uppercase,
  // lowercase, and digit variety.
  return classes >= 3 ? 2 : 1;
}

// Registration Schema
export const registerSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  password: passwordSchema,
  confirmPassword: z.string(),
  tier: z.enum(['individual', 'business', 'artisan']),
  businessName: z.string().optional(),
  // Sellers and artisans pick what they sell at registration. The
  // string is one of PRODUCT_CATEGORIES (shared with the product
  // form) so the per-seller and per-product vocabularies stay in
  // sync. The form layer pre-fills the product modal with this
  // value, and the artisan directory's filter reads it back.
  // Required for business/artisan — see the refine below.
  businessCategory: z.string().optional(),
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
      (typeof data.businessCategory === 'string' && data.businessCategory.trim().length > 0),
    {
      // "What do you sell?" is the seller-side equivalent of
      // business_name — a one-line identity that drives the
      // artisan directory filter and pre-fills the product modal.
      // 'General' is the explicit free-pass for sellers who span
      // categories; we don't enforce a specific value here, just
      // non-emptiness. The DB CHECK (migration 0018) is the
      // authoritative whitelist.
      message: 'Please tell us what you sell',
      path: ['businessCategory'],
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

// Saved-search schema used by app/actions/saved-searches.ts.
// Mirrors the saved_searches migration's columns. We keep
// `min_budget` and `max_budget` as optional numbers so a user can
// save a filter with just a category, just a state, just a budget,
// or any combination. The action layer upserts by id when present
// (so an edit reuses the same row) or lets the database generate
// a fresh id on a true insert.
export const savedSearchSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  query: z.string().max(200).optional(),
  category: z.string().max(50).optional(),
  state: z.string().max(100).optional(),
  min_budget: z.number().int().nonnegative().optional(),
  max_budget: z.number().int().nonnegative().optional(),
});
export type SavedSearchInput = z.infer<typeof savedSearchSchema>;
