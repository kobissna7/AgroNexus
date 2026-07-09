import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import requireRole from '../middleware/role'
import { placeOrder, getMyOrders, getOrder } from '../controllers/orders.controller'
import { BUYER_ROLES } from '../types'

const router = Router()

router.post('/',      authenticate, requireRole(...BUYER_ROLES), placeOrder)
router.get('/mine',   authenticate, requireRole(...BUYER_ROLES), getMyOrders)
router.get('/:id',    authenticate, getOrder)

export default router
