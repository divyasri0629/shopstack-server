const router = require('express').Router();
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', async (_req, res) => res.json(await Product.find().sort('-createdAt')));

router.get('/:id', async (req, res) => {
  const p = await Product.findById(req.params.id).catch(() => null);
  if (!p) return res.status(404).json({ message: 'Product not found' });
  res.json(p);
});

router.post('/', protect, adminOnly, async (req, res) => {
  const { name, description, price, stock, imageUrl } = req.body;
  try {
    res.status(201).json(await Product.create({ name, description, price, stock, imageUrl }));
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  const { name, description, price, stock, imageUrl } = req.body;
  const p = await Product.findByIdAndUpdate(
    req.params.id, { name, description, price, stock, imageUrl },
    { new: true, runValidators: true, omitUndefined: true });
  if (!p) return res.status(404).json({ message: 'Product not found' });
  res.json(p);
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  const p = await Product.findByIdAndDelete(req.params.id);
  if (!p) return res.status(404).json({ message: 'Product not found' });
  res.json({ message: 'Deleted' });
});

module.exports = router;
