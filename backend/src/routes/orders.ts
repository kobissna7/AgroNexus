import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import requireRole from '../middleware/role'
import { placeOrder, getMyOrders, getOrder } from '../controllers/orders.controller'

const router = Router()

router.post('/',      authenticate, requireRole('consumer', 'retailer'), placeOrder)
router.get('/mine',   authenticate, requireRole('consumer', 'retailer'), getMyOrders)
router.get('/:id',    authenticate, getOrder)

export default router
