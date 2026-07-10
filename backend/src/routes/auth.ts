import { Router } from 'express'
import { register, login, forgotPassword, resetPassword, diagnostics } from '../controllers/auth.controller'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)
router.get('/diagnostics', diagnostics)

export default router
