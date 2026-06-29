import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { getPrices, getSupply, getActivity } from '../controllers/dashboard.controller'

const router = Router()

router.get('/prices',   authenticate, getPrices)
router.get('/supply',   authenticate, getSupply)
router.get('/activity', authenticate, getActivity)

export default router
