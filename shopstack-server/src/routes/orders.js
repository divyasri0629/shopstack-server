const router = require('express').Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/auth');

// Put back stock for reservations already made (used when a later step fails).
async function release(reserved) {
  await Promise.all(reserved.map((r) =>
    Product.updateOne({ _id: r.product }, { $inc: { stock: r.qty } })));
}

router.post('/', protect, async (req, res) => {
  const raw = Array.isArray(req.body.items) ? req.body.items : [];
  if (!raw.length) return res.status(400).json({ message: 'Order must contain items' });

  // Merge duplicates; only productId and qty are read from the client.
  // Any price / total sent by the client is ignored on purpose.
  const wanted = new Map();
  for (const it of raw) {
    const qty = Number(it.qty);
    if (!mongoose.isValidObjectId(it.productId) || !Number.isInteger(qty) || qty < 1)
      return res.status(400).json({ message: 'Invalid item' });
    wanted.set(String(it.productId), (wanted.get(String(it.productId)) || 0) + qty);
  }

  const reserved = [];
  const items = [];
  let total = 0;

  for (const [productId, qty] of wanted) {
    // Atomic: decrements only if enough stock remains, in a single DB operation.
    const product = await Product.findOneAndUpdate(
      { _id: productId, stock: { $gte: qty } },
      { $inc: { stock: -qty } },
      { new: true });
    if (!product) {
      await release(reserved);
      return res.status(409).json({ message: 'Insufficient stock or product not found', productId });
    }
    reserved.push({ product: product._id, qty });
    items.push({ product: product._id, name: product.name, price: product.price, qty });
    total += product.price * qty; // server-side price
  }

  try {
    const order = await Order.create({ user: req.user._id, items, total });
    res.status(201).json(order);
  } catch (e) {
    await release(reserved);
    res.status(500).json({ message: 'Could not create order' });
  }
});

router.get('/mine', protect, async (req, res) =>
  res.json(await Order.find({ user: req.user._id }).sort('-createdAt')));

router.get('/', protect, adminOnly, async (_req, res) =>
  res.json(await Order.find().populate('user', 'name email').sort('-createdAt')));

router.get('/:id', protect, async (req, res) => {
  const order = await Order.findById(req.params.id).catch(() => null);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (String(order.user) !== String(req.user._id) && req.user.role !== 'admin')
    return res.status(403).json({ message: 'Forbidden' });
  res.json(order);
});

module.exports = router;
