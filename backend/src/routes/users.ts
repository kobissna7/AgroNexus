import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { updateLocation } from '../controllers/users.controller'

const router = Router()

router.put('/location', authenticate, updateLocation)

export default router
