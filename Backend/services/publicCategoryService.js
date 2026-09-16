const Category = require('../models/categoryModel');

const listCategories = async () => {
  return Category.find().sort({ name: 1 }).lean();
};

const getCategoryBySlug = async (slug) => {
  // A slug can point at a top-level category OR one of its subcategories
  // (the customer frontend routes both the same way, e.g. /category/:slug).
  let category = await Category.findOne({ slug }).lean();
  if (category) return { category, isParent: true };

  const parent = await Category.findOne({ 'subcategory.slug': slug }).lean();
  if (!parent) {
    throw { status: 404, message: 'Category not found' };
  }
  const sub = parent.subcategory.find((s) => s.slug === slug);
  return {
    category: { ...sub, parentSlug: parent.slug, parentName: parent.name },
    isParent: false,
  };
};

module.exports = { listCategories, getCategoryBySlug };
