const mongoose = require('mongoose');

/*
 * One Order per checkout (a customer can buy from several sellers in one
 * go), with per-item seller/price/quantity snapshots so later price or
 * stock changes on the Product never rewrite history.
 *
 * Standard e-commerce status pipeline: Placed -> Processing -> Shipped ->
 * Delivered, with Cancelled as a side-branch (only reachable from Placed
 * or Processing). `statusHistory` records every transition with a
 * timestamp so the customer-facing "Track Order" page can show a real
 * timeline instead of just the current state.
 */
const ORDER_STATUSES = ['Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
// Which statuses the customer is still allowed to cancel from themselves.
const CANCELLABLE_FROM = ['Placed', 'Processing'];

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },
    name: { type: String, required: true },
    image: { type: String },
    size: { type: String, default: '' },
    color: { type: String, default: '' },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [orderItemSchema], required: true },
    deliveryInfo: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      enum: ['cod'],
      default: 'cod',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
    },
    subtotal: { type: Number, required: true },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'Placed',
    },
    statusHistory: {
      type: [
        {
          status: { type: String, enum: ORDER_STATUSES, required: true },
          at: { type: Date, default: Date.now },
          note: { type: String, default: '' },
        },
      ],
      default: () => [{ status: 'Placed', at: new Date() }],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.CANCELLABLE_FROM = CANCELLABLE_FROM;
