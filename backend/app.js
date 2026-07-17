import cors from 'cors'
import express from 'express'
import analyticsRoutes from './routes/analytics.routes.js'
import advisorRoutes from './routes/advisor.routes.js'
import agentRoutes from './routes/agent.routes.js'
import { checkDatabaseConnection } from './services/database.service.js'
import inventoryRoutes from './routes/inventory.routes.js'
import marketingRoutes from './routes/marketing.routes.js'
import orderRoutes from './routes/order.routes.js'
import productRoutes from './routes/product.routes.js'
// Facebook Open Graph share route is deferred until Facebook sharing is resumed.
// import publicShareRoutes from './routes/public-share.routes.js'

const app = express()
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173'

app.use(cors({ origin: allowedOrigin }))
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






