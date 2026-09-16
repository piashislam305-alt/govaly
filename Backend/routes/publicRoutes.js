const express = require('express');
const router = express.Router();

const { getCategories, getCategory } = require('../controllers/publicCategoryController');
const { getSeller } = require('../controllers/publicSellerController');
const {
  getProducts,
  getProduct,
  getProductReviews,
} = require('../controllers/publicProductController');

router.get('/categories', getCategories);
router.get('/categories/:slug', getCategory);

router.get('/sellers/:slug', getSeller);

router.get('/products', getProducts);
router.get('/products/:slug', getProduct);
router.get('/products/:slug/reviews', getProductReviews);

module.exports = router;
