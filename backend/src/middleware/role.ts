import { Request, Response, NextFunction } from 'express'
import type { UserRole } from '../types'

const requireRole = (...roles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden: insufficient role' })
      return
    }
    next()
  }

export default requireRole
