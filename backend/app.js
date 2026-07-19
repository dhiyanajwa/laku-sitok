import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import analyticsRoutes from './routes/analytics.routes.js'
import advisorRoutes from './routes/advisor.routes.js'
import agentRoutes from './routes/agent.routes.js'
import { checkDatabaseConnection } from './services/database.service.js'
import inventoryRoutes from './routes/inventory.routes.js'
import marketingRoutes from './routes/marketing.routes.js'
import managerRoutes from './routes/manager.routes.js'
import orderRoutes from './routes/order.routes.js'
import productRoutes from './routes/product.routes.js'
import stallAvailabilityRoutes from './routes/stall-availability.routes.js'
// Facebook Open Graph share route is deferred until Facebook sharing is resumed.
// import publicShareRoutes from './routes/public-share.routes.js'

const app = express()
const configuredFrontendOrigin = process.env.FRONTEND_URL || 'http://localhost:5173'
const allowedFrontendOrigins = new Set([
  configuredFrontendOrigin,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

app.disable('x-powered-by')

// Enable this only on a deployment host that sits behind one trusted proxy.
// It lets the public-order rate limiter use the visitor's real IP address.
if (process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1)
}

// This server only returns API responses. The frontend host should set its own
// CSP because it knows the scripts, styles, and Supabase connections it serves.
// Helmet still protects API responses with safe defaults such as nosniff,
// frame protection, referrer policy, and production-only HSTS.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: { action: 'deny' },
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 15_552_000 }
    : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}))

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedFrontendOrigins.has(origin)) return callback(null, true)
    return callback(new Error('This frontend origin is not allowed.'))
  },
}))
app.use(express.json())

// Facebook Open Graph share route is deferred until Facebook sharing is resumed.
// app.use('/share', publicShareRoutes)
app.use('/api/agents', agentRoutes)
app.use('/api/advisor', advisorRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/marketing', marketingRoutes)
app.use('/api/manager', managerRoutes)
app.use('/api/stall-availability', stallAvailabilityRoutes)

app.get('/api/health', (_request, response) => {
  response.status(200).json({
    message: 'Laku Sitok API is running',
    status: 'ok',
  })
})

app.get('/api/health/database', async (_request, response) => {
  try {
    const database = await checkDatabaseConnection()
    response.status(200).json({ status: 'ok', database })
  } catch {
    response.status(503).json({
      status: 'error',
      message: 'Unable to connect to Supabase.',
    })
  }
})

app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(error.statusCode || 500).json({
    message: error.statusCode ? error.message : 'An unexpected server error occurred.',
    status: 'error',
  })
})

export default app






