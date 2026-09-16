const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/categoryModel');
const Review = require('../models/reviewModel');

const SORTS = {
  new: { createdAt: -1 },
  price_asc: { sale_price: 1 },
  price_desc: { sale_price: -1 },
  rating: { rating: -1 },
  popular: { sold_items: -1 },
};

// category param can be a slug (top-level or sub) or a raw ObjectId
const resolveCategoryFilter = async (categorySlug) => {
  if (!categorySlug) return null;
  if (mongoose.Types.ObjectId.isValid(categorySlug)) return { category: categorySlug };

  const parent = await Category.findOne({ slug: categorySlug }).lean();
  if (parent) return { category: parent._id };

  // it might be a subcategory slug — Product doesn't reference subcategory
  // directly, so match by name in description/name as a best-effort filter
  // until products carry their own subcategory reference.
  const owner = await Category.findOne({ 'subcategory.slug': categorySlug }).lean();
  if (owner) {
    const sub = owner.subcategory.find((s) => s.slug === categorySlug);
    return { category: owner._id, $or: [{ name: new RegExp(sub.name, 'i') }] };
  }
  return { category: null }; // no match — return nothing rather than everything
};

const listProducts = async (query) => {
  const { search, category, seller, sort, page = 1, limit = 20 } = query;
  const q = { status: 'in_stock' };

  if (search) {
    q.$or = [
      { name: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
    ];
  }
  if (category) {
    const catFilter = await resolveCategoryFilter(category);
    if (catFilter) Object.assign(q, catFilter);
  }
  if (seller && mongoose.Types.ObjectId.isValid(seller)) q.seller = seller;

  const pageNum = Math.max(1, Number(page) || 1);
  const lim = Math.min(60, Number(limit) || 20);

  const [items, total] = await Promise.all([
    Product.find(q)
      .populate('category', 'name slug')
      .populate('seller', 'shopName shopSlug ratings')
      .sort(SORTS[sort] || SORTS.new)
      .skip((pageNum - 1) * lim)
      .limit(lim)
      .lean(),
    Product.countDocuments(q),
  ]);

  return { items, total, page: pageNum, pages: Math.ceil(total / lim) || 1 };
};

const getProductBySlug = async (slug) => {
  const product = await Product.findOne({ slug })
    .populate('category', 'name slug')
    .populate('seller', 'shopName shopSlug ratings')
    .lean();
  if (!product) throw { status: 404, message: 'Product not found' };
  return product;
};

const listReviewsForProduct = async (slug) => {
  const product = await Product.findOne({ slug }).select('_id').lean();
  if (!product) throw { status: 404, message: 'Product not found' };
  return Review.find({ product: product._id })
    .populate('customer', 'name image')
    .sort('-createdAt')
    .lean();
};

module.exports = { listProducts, getProductBySlug, listReviewsForProduct };
