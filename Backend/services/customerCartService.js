const User = require('../models/userModel');
const Product = require('../models/Product');

const getCart = async (userId) => {
  const user = await User.findById(userId).populate({
    path: 'cartItems.product',
    populate: [{ path: 'seller', select: 'shopName shopSlug' }],
  });
  // itemId (used by PATCH/DELETE :itemId in the doc) is the cart subdocument's own _id
  return user.cartItems.map((i) => ({
    itemId: i._id,
    product: i.product,
    size: i.size,
    color: i.color,
    quantity: i.quantity,
  }));
};

const addToCart = async (userId, productId, quantity = 1, size = '', color = '') => {
  const product = await Product.findById(productId);
  if (!product) throw { status: 404, message: 'Product not found' };

  const user = await User.findById(userId);
  const existing = user.cartItems.find(
    (i) => i.product.toString() === productId && (i.size || '') === (size || '') && (i.color || '') === (color || '')
  );
  if (existing) {
    existing.quantity += Number(quantity) || 1;
  } else {
    user.cartItems.push({ product: productId, quantity: Number(quantity) || 1, size: size || '', color: color || '' });
  }
  await user.save();
  return getCart(userId);
};

const updateCartItem = async (userId, itemId, quantity) => {
  const user = await User.findById(userId);
  const item = user.cartItems.id(itemId);
  if (!item) throw { status: 404, message: 'Cart item not found' };

  if (quantity <= 0) {
    item.deleteOne();
  } else {
    item.quantity = quantity;
  }
  await user.save();
  return getCart(userId);
};

const removeCartItem = async (userId, itemId) => {
  const user = await User.findById(userId);
  const item = user.cartItems.id(itemId);
  if (item) item.deleteOne();
  await user.save();
  return getCart(userId);
};

module.exports = { getCart, addToCart, updateCartItem, removeCartItem };
