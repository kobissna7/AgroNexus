/** Role → home destination, and safe handling of ?next= redirect intents. */
export const dashboardByRole: Record<string, string> = {
  farmer: '/farmer/dashboard',
  consumer: '/consumer/browse',
  wholesaler: '/consumer/browse',
  retailer: '/consumer/browse',
  direct_consumer: '/consumer/browse',
  transporter: '/transporter/feed',
  admin: '/admin',
}

/** Only honor same-app paths (open-redirect guard). */
export function safeNext(next: string | null): string | null {
  if (next && next.startsWith('/') && !next.startsWith('//')) return next
  return null
}

/** Where to send a user after auth: their ?next= intent, else their role home. */
export function postAuthDestination(role: string, next: string | null): string {
  return safeNext(next) ?? dashboardByRole[role] ?? '/'
}
