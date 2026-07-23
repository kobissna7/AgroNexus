import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { JwtPayload } from '../types'

/** Attach req.user when a valid Bearer token is present; NEVER 401.
    Used by the events endpoint so anonymous visitors can be tracked and an
    expired token doesn't bounce a user to /login over analytics. */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as JwtPayload
      req.user = { id: payload.id, role: payload.role, email: payload.email }
    } catch {
      // invalid/expired token → proceed anonymously
    }
  }
  next()
}
