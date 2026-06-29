export type UserRole = 'farmer' | 'consumer' | 'direct_consumer' | 'retailer' | 'transporter' | 'admin'

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
