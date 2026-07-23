import { Router } from 'express'
import express from 'express'
import { optionalAuth } from '../middleware/optionalAuth'
import { ingestEvents } from '../controllers/events.controller'

const router = Router()

// sendBeacon posts without an application/json content-type; parse text too.
router.post('/', express.text({ type: 'text/*' }), optionalAuth, ingestEvents)

export default router
