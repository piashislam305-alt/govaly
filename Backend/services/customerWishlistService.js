const User = require('../models/userModel');
const Product = require('../models/Product');

const getWishlist = async (userId) => {
  const user = await User.findById(userId).populate({
    path: 'wishlist',
    populate: [{ path: 'category', select: 'name slug' }, { path: 'seller', select: 'shopName shopSlug' }],
  });
  return user.wishlist;
};

const addToWishlist = async (userId, productId) => {
  const product = await Product.findById(productId);
  if (!product) throw { status: 404, message: 'Product not found' };

  await User.updateOne({ _id: userId }, { $addToSet: { wishlist: productId } });
  return getWishlist(userId);
};

const removeFromWishlist = async (userId, productId) => {
  await User.updateOne({ _id: userId }, { $pull: { wishlist: productId } });
  return getWishlist(userId);
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
