import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import healthRouter from './routes/health'
import authRouter from './routes/auth'
import listingsRouter from './routes/listings'
import marketplaceRouter from './routes/marketplace'
import ordersRouter from './routes/orders'
import transportRouter from './routes/transport'
import dashboardRouter from './routes/dashboard'
import forecastsRouter from './routes/forecasts'
import notificationsRouter from './routes/notifications'
import adminRouter from './routes/admin'
import pricesRouter from './routes/prices'
import usersRouter from './routes/users'
import paymentsRouter from './routes/payments'
import eventsRouter from './routes/events'
import { paystackWebhook, rushpayWebhook } from './controllers/payments.controller'

const app = express()

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: ${origin} not allowed`))
  },
  credentials: true,
}))
// Gateway webhooks need the raw request body (signature verification /
// reconciliation), so they must be mounted BEFORE express.json() consumes
// the stream.
app.post('/api/v1/payments/webhook', express.raw({ type: '*/*' }), paystackWebhook)
app.post('/api/v1/payments/webhook/rushpay', express.raw({ type: '*/*' }), rushpayWebhook)

app.use(express.json())

app.use('/api/v1/health', healthRouter)
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/listings', listingsRouter)
app.use('/api/v1/marketplace', marketplaceRouter)
app.use('/api/v1/orders', ordersRouter)
app.use('/api/v1/transport', transportRouter)
app.use('/api/v1/dashboard', dashboardRouter)
app.use('/api/v1/forecasts', forecastsRouter)
app.use('/api/v1/notifications', notificationsRouter)
app.use('/api/v1/admin',         adminRouter)
app.use('/api/v1/prices',        pricesRouter)
app.use('/api/v1/users',         usersRouter)
app.use('/api/v1/payments',      paymentsRouter)
app.use('/api/v1/events',        eventsRouter)

// Global error handler — malformed JSON, CORS rejections, and anything a
// route throws land here instead of crashing the process.
app.use((err: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status ?? (err.message.startsWith('CORS:') ? 403 : 500)
  if (status >= 500) console.error('Unhandled error:', err.message)
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message })
})

export default app

// Only bind port when run directly (not during tests)
if (process.env.NODE_ENV !== 'test') {
  const PORT = Number(process.env.PORT) || 3001
  app.listen(PORT, () => console.log(`AgroNexus backend running on port ${PORT}`))
}
