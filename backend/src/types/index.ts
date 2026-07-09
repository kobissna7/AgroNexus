export type UserRole = 'farmer' | 'consumer' | 'wholesaler' | 'retailer' | 'direct_consumer' | 'transporter' | 'admin'

// 'consumer' is legacy — kept so JWTs issued before the v2 role migration stay valid.
export const BUYER_ROLES: UserRole[] = ['wholesaler', 'retailer', 'direct_consumer', 'consumer']

export interface AuthUser {
  id: string
  role: UserRole
  email?: string
}

export interface JwtPayload {
  id: string
  role: UserRole
  email: string
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}
