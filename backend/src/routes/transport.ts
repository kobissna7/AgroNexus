import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import requireRole from '../middleware/role'
import { getOpenRequests, acceptRequest, updateStatus, getMyDeliveries, getAvailableTransporters } from '../controllers/transport.controller'

const router = Router()

router.get('/available',     authenticate, getAvailableTransporters)
router.get('/',              authenticate, requireRole('transporter'), getOpenRequests)
router.get('/mine',          authenticate, requireRole('transporter'), getMyDeliveries)
router.put('/:id/accept',    authenticate, requireRole('transporter'), acceptRequest)
router.put('/:id/status',    authenticate, requireRole('transporter'), updateStatus)

export default router
