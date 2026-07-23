import { Router } from 'express'
import { browseMarketplace, getMarketplaceListing } from '../controllers/marketplace.controller'

// Public routes — no authenticate middleware. Guests browse the anonymized
// marketplace before signing up; ordering still requires auth (see /orders).
const router = Router()

router.get('/',    browseMarketplace)
router.get('/:id', getMarketplaceListing)

export default router
