const router = require('express').Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');

const client = () => new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Creates a Razorpay order whose amount comes from OUR stored order total.
router.post('/create/:orderId', protect, async (req, res) => {
  const order = await Order.findById(req.params.orderId).catch(() => null);
  if (!order || String(order.user) !== String(req.user._id))
    return res.status(404).json({ message: 'Order not found' });
  if (order.status !== 'pending') return res.status(409).json({ message: 'Order is not payable' });
  try {
    const rp = await client().orders.create({
      amount: Math.round(order.total * 100), // paise
      currency: 'INR',
      receipt: String(order._id),
    });
    order.razorpayOrderId = rp.id;
    await order.save();
    res.json({ razorpayOrderId: rp.id, amount: rp.amount, currency: rp.currency, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (e) {
    res.status(502).json({ message: 'Payment provider error' });
  }
});

// Verifies the checkout signature (HMAC-SHA256 of "order_id|payment_id").
router.post('/verify', protect, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const order = await Order.findOne({ razorpayOrderId: razorpay_order_id, user: req.user._id });
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
  const ok = razorpay_signature && expected.length === razorpay_signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature));
  if (!ok) return res.status(400).json({ message: 'Invalid payment signature' });

  order.status = 'paid';
  order.razorpayPaymentId = razorpay_payment_id;
  await order.save();
  res.json(order);
});

module.exports = router;
