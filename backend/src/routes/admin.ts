import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import requireRole from '../middleware/role'
import {
  getStats,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAllListings,
  updateListingStatus,
  getAllOrders,
  getLocationData,
} from '../controllers/admin.controller'

const router = Router()

router.use(authenticate, requireRole('admin'))

router.get('/stats',                  getStats)
router.get('/users',                  getAllUsers)
router.patch('/users/:id/role',       updateUserRole)
router.delete('/users/:id',           deleteUser)
router.get('/listings',               getAllListings)
router.patch('/listings/:id/status',  updateListingStatus)
router.get('/orders',                 getAllOrders)
router.get('/locations',              getLocationData)

export default router
