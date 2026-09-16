const mongoose = require('mongoose');
const { slugify } = require('./categoryModel');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
    },
    image: {
      type: String,
      required: [true, 'Product image is required'],
    },
    // Additional gallery images beyond the required cover `image` above —
    // optional, so existing single-image seller listings are unaffected.
    images: {
      type: [String],
      default: [],
    },
    sizes: {
      type: [String],
      default: [],
    },
    colors: {
      type: [String],
      default: [],
    },
    sale_price: {
      type: Number,
      required: [true, 'Sale price is required'],
      min: [0, 'Price cannot be negative'],
    },
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    status: {
      type: String,
      enum: ['in_stock', 'out_of_stock'],
      default: 'in_stock',
    },
    sold_items: {
      type: Number,
      default: 0,
    },
    // Cached aggregate from Review documents — recomputed whenever a review
    // is submitted (see customerReviewService). Cached rather than computed
    // on every product-list request, since that would mean an aggregation
    // per product on every listing page.
    rating: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
      required: [true, 'Seller reference is required'],
    },
  },
  {
    timestamps: true,
  }
);

productSchema.pre('validate', async function (next) {
  if (this.name && (!this.slug || this.isModified('name'))) {
    const base = slugify(this.name);
    let candidate = base;
    let i = 1;
    // Disambiguate — two sellers can easily list a product with the same name.
    while (await mongoose.models.Product.exists({ slug: candidate, _id: { $ne: this._id } })) {
      candidate = `${base}-${++i}`;
    }
    this.slug = candidate;
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);