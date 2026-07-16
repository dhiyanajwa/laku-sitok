# Live Order Journey Implementation Plan

## Goal

Create a connected customer-to-kitchen order journey that lets a customer track an order from checkout through pickup. The experience should make order, kitchen, inventory, analytics, and agent activity feel like one product flow.

## 1. Secure Tracking Foundation

Add a unique, unguessable tracking token to every order.

- Add `tracking_token` to the `orders` table as a unique UUID.
- Create the token automatically when an order is created.
- Return the token in the order-creation response.
- Send customers to `/track/:trackingToken` after checkout.
- Keep the public tracking route restricted to safe order information; do not expose customer names, vendor details, or general order lookup.

Customer-facing states:

`Order received -> Preparing your food -> Ready for pickup -> Completed`

Cancelled orders should show a clear message asking the customer to speak with the vendor.

## 2. Public Tracking API

Add a public endpoint:

`GET /api/orders/track/:trackingToken`

Return only the details required by the customer:

- Order number
- Current status
- Ordered items
- Order creation time
- Optional estimated wait time

For the first version, poll this endpoint every 5 to 10 seconds. This creates a near-live experience without exposing Supabase Realtime directly to public users. Server-sent events or realtime updates can be considered later.

## 3. Customer Experience

Replace the current order-received dialog with a full confirmation experience containing:

- A success icon or animation and a large order number
- An estimated preparation time, for example: "Usually ready in 10-15 minutes"
- A prominent **Track my order** button
- A copyable tracking link or QR code
- A button to return to the menu

Build a mobile-first `/track/:trackingToken` page with:

- A visual four-step progress indicator
- Friendly, status-specific messages
- An "Updated just now" indicator
- A prominent "Ready for pickup" state
- Order summary and pickup order number

## 4. Kitchen Improvements

Make vendor actions visibly update the customer journey.

- Add elapsed time to each kitchen card.
- Use clear actions: **Start preparing**, **Mark ready**, and **Complete**.
- Show a lightweight confirmation after the vendor marks an order ready.
- Highlight orders that have been waiting longer than the expected preparation time.

## 5. Demo Wow Moments

Add small, high-impact polish to make the flow memorable:

- Show a "Popular today" tag in the customer menu using existing sales data.
- Display an estimated ready time on the menu and tracking page.
- Use a branded ready-for-pickup success state with the customer's order number.
- Add agent activity such as: "Order #1042 added RM12.50 revenue; stock updated."
- Show a concise dashboard insight after a completed order, for example: "Nasi Lemak is now today's best seller."

## 6. End-to-End Testing

Test this mobile-first demo flow:

1. A customer scans the QR code and places an order.
2. The confirmation screen opens the unique tracking link.
3. The vendor moves the order to Preparing.
4. The tracking page updates automatically.
5. The vendor marks the order Ready.
6. The customer sees the ready-for-pickup screen.
7. The vendor completes the order and analytics/activity update.

Also update `README.md`, `FEATURES.md`, and `ROADMAP.md` to present live order tracking and the existing AI Advisor as implemented functionality.

## Recommended Delivery Order

1. Secure tracking token and public tracking endpoint.
2. Customer confirmation and tracking page.
3. Kitchen timing and ready-state feedback.
4. Menu, analytics, and agent-activity polish.
5. End-to-end testing and documentation updates.
