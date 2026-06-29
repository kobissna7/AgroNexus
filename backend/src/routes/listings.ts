import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import requireRole from '../middleware/role'
import {
  createListing, getAllListings, getMyListings,
  updateListing, deleteListing, getFarmerOrders,
} from '../controllers/listings.controller'

const router = Router()

router.get('/',      authenticate, getAllListings)
router.post('/',     authenticate, requireRole('farmer'), createListing)
router.get('/mine',  authenticate, requireRole('farmer'), getMyListings)
router.get('/orders',authenticate, requireRole('farmer'), getFarmerOrders)
router.put('/:id',   authenticate, requireRole('farmer'), updateListing)
router.delete('/:id',authenticate, requireRole('farmer'), deleteListing)

export default router
