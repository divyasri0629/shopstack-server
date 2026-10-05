const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,
    price: Number, // price snapshot taken on the server
    qty: { type: Number, min: 1 },
  }],
  total: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'paid', 'cancelled'], default: 'pending' },
  razorpayOrderId: String,
  razorpayPaymentId: String,
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
