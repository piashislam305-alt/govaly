const mongoose = require("mongoose");

const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const subcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      trim: true,
    },

    image: {
      type: String,
      trim: true,
    },
  },
  {
    _id: true,
  }
);

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      trim: true,
    },

    subcategory: {
      type: [subcategorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Auto-derive slugs from name whenever a category (or its subcategories) is
// saved directly — the admin service still writes through .create()/.save(),
// so this is transparent to existing admin code. Bulk update paths (findByIdAndUpdate)
// re-derive slugs explicitly in the service layer instead, since this hook doesn't fire there.
categorySchema.pre("validate", function (next) {
  if (this.name && (!this.slug || this.isModified("name"))) this.slug = slugify(this.name);
  (this.subcategory || []).forEach((sc) => {
    if (sc.name && (!sc.slug || sc.isModified("name"))) sc.slug = slugify(sc.name);
  });
  next();
});

module.exports = mongoose.model(
  "Category",
  categorySchema
);
module.exports.slugify = slugify;