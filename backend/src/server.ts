import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import healthRouter from './routes/health'
import authRouter from './routes/auth'
import listingsRouter from './routes/listings'
import ordersRouter from './routes/orders'
import transportRouter from './routes/transport'
import dashboardRouter from './routes/dashboard'
import forecastsRouter from './routes/forecasts'
import notificationsRouter from './routes/notifications'
import adminRouter from './routes/admin'
import pricesRouter from './routes/prices'
import usersRouter from './routes/users'

const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000', credentials: true }))
app.use(express.json())

app.use('/api/v1/health', healthRouter)
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/listings', listingsRouter)
app.use('/api/v1/orders', ordersRouter)
app.use('/api/v1/transport', transportRouter)
app.use('/api/v1/dashboard', dashboardRouter)
app.use('/api/v1/forecasts', forecastsRouter)
app.use('/api/v1/notifications', notificationsRouter)
app.use('/api/v1/admin',         adminRouter)
app.use('/api/v1/prices',        pricesRouter)
app.use('/api/v1/users',         usersRouter)

export default app

// Only bind port when run directly (not during tests)
if (process.env.NODE_ENV !== 'test') {
  const PORT = Number(process.env.PORT) || 3001
  app.listen(PORT, () => console.log(`AgroNexus backend running on port ${PORT}`))
}
