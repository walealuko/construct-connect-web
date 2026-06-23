export type UserRole = 'admin' | 'business' | 'individual' | 'artisan';

export const REDIRECT_MAP: Record<UserRole, string> = {
  admin: '/admin-dashboard',
  business: '/seller-dashboard',
  // Individual users land on the buyer dashboard after sign-in or
  // sign-up, not the marketing landing page. The landing page is
  // for unauthenticated visitors; someone who just authenticated
  // wants to see their account, not the hero section. The home
  // page (`/`) still renders the IndividualHub for individual
  // users who navigate there directly — this redirect is the
  // post-auth default, not the only path to the hub.
  individual: '/buyer-dashboard',
  artisan: '/artisan-dashboard',
};

export function getRedirectPath(role: string | undefined): string {
  if (!role) return '/login';
  const castRole = role as UserRole;
  return REDIRECT_MAP[castRole] || REDIRECT_MAP.individual;
}
