const User = require('../models/userModel');
const Product = require('../models/Product');
const Order = require('../models/orderModel');

const checkout = async (userId, { deliveryInfo, paymentMethod }) => {
  if (!deliveryInfo?.fullName || !deliveryInfo?.phone || !deliveryInfo?.address) {
    throw { status: 400, message: 'fullName, phone and address are required in deliveryInfo.' };
  }

  const user = await User.findById(userId).populate('cartItems.product');
  if (!user.cartItems.length) throw { status: 400, message: 'Your cart is empty.' };

  // Snapshot price/name/image/seller at the moment of purchase — a later
  // price change or the product being removed should never rewrite history.
  const items = user.cartItems.map((i) => {
    const p = i.product;
    if (!p) throw { status: 400, message: 'One of the items in your cart no longer exists.' };
    return {
      product: p._id,
      seller: p.seller,
      name: p.name,
      image: p.image,
      size: i.size || '',
      color: i.color || '',
      price: p.sale_price,
      quantity: i.quantity,
    };
  });
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const order = await Order.create({
    customer: userId,
    items,
    deliveryInfo,
    paymentMethod: paymentMethod === 'cod' || !paymentMethod ? 'cod' : paymentMethod,
    subtotal,
  });

  // Decrement stock, flip out_of_stock, bump sold_items — best-effort per item.
  await Promise.all(
    items.map((i) =>
      Product.updateOne(
        { _id: i.product },
        [
          { $set: { stock: { $max: [{ $subtract: ['$stock', i.quantity] }, 0] }, sold_items: { $add: ['$sold_items', i.quantity] } } },
          { $set: { status: { $cond: [{ $lte: ['$stock', 0] }, 'out_of_stock', 'in_stock'] } } },
        ]
      )
    )
  );

  user.cartItems = [];
  await user.save();

  return order;
};

const listOrders = async (userId, status) => {
  const q = { customer: userId };
  if (status) q.status = status;
  return Order.find(q)
    .populate('items.product', 'name image slug')
    .populate('items.seller', 'shopName shopSlug')
    .sort('-createdAt')
    .lean();
};

const getOrder = async (userId, orderId) => {
  const order = await Order.findOne({ _id: orderId, customer: userId })
    .populate('items.product', 'name image slug')
    .populate('items.seller', 'shopName shopSlug')
    .lean();
  if (!order) throw { status: 404, message: 'Order not found' };
  return order;
};

const trackOrder = async (userId, orderId) => {
  const order = await Order.findOne({ _id: orderId, customer: userId })
    .select('status statusHistory createdAt updatedAt')
    .lean();
  if (!order) throw { status: 404, message: 'Order not found' };
  return { status: order.status, statusHistory: order.statusHistory, updatedAt: order.updatedAt };
};

const cancelOrder = async (userId, orderId) => {
  const order = await Order.findOne({ _id: orderId, customer: userId });
  if (!order) throw { status: 404, message: 'Order not found' };
  if (!Order.CANCELLABLE_FROM.includes(order.status)) {
    throw { status: 400, message: `An order that is already "${order.status}" can no longer be cancelled.` };
  }

  order.status = 'Cancelled';
  order.statusHistory.push({ status: 'Cancelled', at: new Date() });
  await order.save();

  // Restock what was reserved for this order — best-effort per item.
  await Promise.all(
    order.items.map((i) =>
      Product.updateOne(
        { _id: i.product },
        [
          { $set: { stock: { $add: ['$stock', i.quantity] } } },
          { $set: { status: 'in_stock' } },
        ]
      )
    )
  );

  return order;
};

module.exports = { checkout, listOrders, getOrder, trackOrder, cancelOrder };
