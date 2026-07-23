import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import requireRole from '../middleware/role'
import { BUYER_ROLES } from '../types'
import { getConfig, initializePayment, verifyPayment } from '../controllers/payments.controller'

// NOTE: the webhook route is NOT here — it needs the raw request body for HMAC
// verification, so it's mounted directly in server.ts before express.json().
const router = Router()

router.get('/config', getConfig)
router.post('/initialize', authenticate, requireRole(...BUYER_ROLES), initializePayment)
router.get('/verify/:reference', authenticate, verifyPayment)

export default router
