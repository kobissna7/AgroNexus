import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { getNotifications, markRead } from '../controllers/notifications.controller'

const router = Router()

router.get('/',          authenticate, getNotifications)
router.post('/mark-read', authenticate, markRead)

export default router
