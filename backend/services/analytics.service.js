import supabase from '../config/supabase.js'

const malaysiaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit',
})

function dateKey(date) { return malaysiaDateFormatter.format(date) }

function dateKeysForLastSevenDays() {
  const dates = []
  const today = new Date()
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setUTCDate(date.getUTCDate() - offset)
    dates.push(dateKey(date))
  }
  return dates
}

export async function getAnalyticsOverview(vendorId) {
  const [ordersResult, inventoryResult] = await Promise.all([
    supabase.from('orders').select('id, total_amount, created_at, order_items(product_name, unit_price, unit_cost, quantity)').eq('vendor_id', vendorId).eq('status', 'completed'),
    supabase.from('inventory').select('quantity, reorder_level, products(name)').eq('products.vendor_id', vendorId),
  ])
  if (ordersResult.error) throw ordersResult.error
  if (inventoryResult.error) throw inventoryResult.error

  const orders = ordersResult.data || []
  const dayKeys = dateKeysForLastSevenDays()
  const salesByDay = new Map(dayKeys.map((key) => [key, 0]))
  const productTotals = new Map()
  let overallRevenue = 0
  let overallProfit = 0
  let todayRevenue = 0
  let todayOrderCount = 0
  const todayKey = dayKeys.at(-1)

  for (const order of orders) {
    const revenue = Number(order.total_amount)
    const orderDate = dateKey(new Date(order.created_at))
    overallRevenue += revenue
    if (salesByDay.has(orderDate)) salesByDay.set(orderDate, salesByDay.get(orderDate) + revenue)
    if (orderDate === todayKey) { todayRevenue += revenue; todayOrderCount += 1 }
    for (const item of order.order_items || []) {
      const quantity = Number(item.quantity)
      const profit = (Number(item.unit_price) - Number(item.unit_cost)) * quantity
      overallProfit += profit
      const current = productTotals.get(item.product_name) || { quantity: 0, revenue: 0, profit: 0 }
      current.quantity += quantity
      current.revenue += Number(item.unit_price) * quantity
      current.profit += profit
      productTotals.set(item.product_name, current)
    }
  }

  const bestSeller = Array.from(productTotals.entries()).sort(([, left], [, right]) => right.quantity - left.quantity)[0]
  const productPerformance = Array.from(productTotals.entries())
    .map(([name, values]) => ({ name, quantity: values.quantity, revenue: Number(values.revenue.toFixed(2)), profit: Number(values.profit.toFixed(2)) }))
    .sort((left, right) => right.profit - left.profit)

  const lowStock = (inventoryResult.data || []).filter((item) => item.quantity <= item.reorder_level).map((item) => ({ name: item.products?.name || 'Unnamed product', quantity: item.quantity, reorderLevel: item.reorder_level }))

  return {
    today: { revenue: Number(todayRevenue.toFixed(2)), orderCount: todayOrderCount },
    overall: { revenue: Number(overallRevenue.toFixed(2)), profit: Number(overallProfit.toFixed(2)), orderCount: orders.length },
    bestSeller: bestSeller ? { name: bestSeller[0], quantity: bestSeller[1].quantity, revenue: Number(bestSeller[1].revenue.toFixed(2)), profit: Number(bestSeller[1].profit.toFixed(2)) } : null,
    dailySales: dayKeys.map((date) => ({ date, revenue: Number(salesByDay.get(date).toFixed(2)) })),
    productPerformance,
    lowStock,
  }
}

