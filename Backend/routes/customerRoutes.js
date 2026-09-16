const express = require('express');

const router = express.Router();

const {
  registerCustomer,
  loginCustomer,
  forgotPassword,
  resetPassword,
} = require('../controllers/customerAuthController');
const { getMe, patchMe, patchPassword } = require('../controllers/customerProfileController');
const {
  listWishlist,
  addItem: addWishlistItem,
  removeItem: removeWishlistItem,
} = require('../controllers/customerWishlistController');
const {
  viewCart,
  addItem: addCartItem,
  patchItem: patchCartItem,
  removeItem: removeCartItem,
} = require('../controllers/customerCartController');
const {
  postCheckout,
  getOrders,
  getOrderDetail,
  getOrderTrack,
  postCancel,
} = require('../controllers/customerOrderController');
const { postReview } = require('../controllers/customerReviewController');
const { protectCustomer } = require('../middleware/authMiddleware');

// Public Customer Auth
router.post('/auth/register', registerCustomer);
router.post('/auth/login', loginCustomer);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password/:token', resetPassword);

// Everything below requires a valid customer JWT
router.use(protectCustomer);

router.get('/me', getMe);
router.patch('/me', patchMe);
router.patch('/change-password', patchPassword);

router.get('/wishlist', listWishlist);
router.post('/wishlist/:productId', addWishlistItem);
router.delete('/wishlist/:productId', removeWishlistItem);

router.get('/cart', viewCart);
router.post('/cart', addCartItem);
router.patch('/cart/:itemId', patchCartItem);
router.delete('/cart/:itemId', removeCartItem);

router.post('/checkout', postCheckout);
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderDetail);
router.get('/orders/:id/track', getOrderTrack);
router.post('/orders/:id/cancel', postCancel);

router.post('/products/:id/review', postReview);

module.exports = router;
