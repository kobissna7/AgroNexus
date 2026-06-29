import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { getForecast, getForecastSummary, getMLHealth } from '../controllers/forecasts.controller'

const router = Router()

router.get('/health',  getMLHealth)
router.get('/summary', authenticate, getForecastSummary)
router.post('/predict', authenticate, getForecast)

export default router
