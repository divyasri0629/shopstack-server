# ShopStack server

Express + MongoDB + JWT API for an e-commerce store, with Razorpay (test mode) payments.

## Run
    cp .env.example .env     # fill in values
    npm install
    npm run dev
    npm test                 # uses in-memory MongoDB, no setup needed
    ADMIN_EMAIL=a@b.com ADMIN_PASSWORD=secret123 node src/seedAdmin.js

## API
- POST /api/auth/register, /login; GET /api/auth/me
- GET /api/products, /:id; POST/PUT/DELETE (admin only)
- POST /api/orders (logged in), GET /api/orders/mine, GET /api/orders (admin)
- POST /api/payments/create/:orderId, POST /api/payments/verify

## Design notes (the resume claims)
- **No overselling:** `findOneAndUpdate({_id, stock: {$gte: qty}}, {$inc: {stock: -qty}})` is a single atomic
  operation, so concurrent buyers can never push stock below zero. Partial reservations are rolled back.
- **No price tampering:** the client sends only productId and qty; prices and totals come from the DB.
  The Razorpay amount comes from the stored order total, and payment signatures are verified with HMAC.
- **Access control:** JWT middleware on protected routes; `adminOnly` for product/order management;
  register can never create an admin.

## Filling in your resume numbers
Run `npm test` and use the "Tests: N passed" count for [N] passing tests.
The concurrency test uses 10 simultaneous buyers for 5 units.
Protected routes: count routes using `protect` in src/routes.
