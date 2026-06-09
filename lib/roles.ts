export type UserRole = 'admin' | 'business' | 'individual';

export const REDIRECT_MAP: Record<UserRole, string> = {
  admin: '/admin-dashboard',
  business: '/seller-dashboard',
  individual: '/marketplace',
};

export function getRedirectPath(role: string | undefined): string {
  if (!role) return '/login';
  const castRole = role as UserRole;
  return REDIRECT_MAP[castRole] || REDIRECT_MAP.individual;
}
