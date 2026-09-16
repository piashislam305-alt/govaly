/**
 * The real backend (Backend-dev repo) uses different field names and a
 * different category shape than this frontend was originally built against
 * (a leftover prototype server). Rather than rewriting every page to match
 * the backend one-off, these functions normalize backend responses into the
 * shape the existing components already expect — `price` not `sale_price`,
 * `seller` as a slug string not a populated object, categories flattened
 * into a single parent+child list instead of nested subcategory arrays, etc.
 *
 * NOTE: the real backend has no "group" concept (Men/Women/Kids/Baby/Health
 * & Beauty) — categories are just whatever the admin creates, one level of
 * subcategory deep. Anywhere the old frontend filtered by `group=`, that's
 * now just filtering by top-level `category=` instead.
 */

export function normalizeProduct(p) {
  if (!p) return p;
  const seller = typeof p.seller === 'object' && p.seller ? p.seller : null;
  const category = typeof p.category === 'object' && p.category ? p.category : null;
  return {
    ...p,
    price: p.sale_price ?? p.price,
    images: p.images?.length ? p.images : [p.image].filter(Boolean),
    sizes: p.sizes || [],
    colors: p.colors || [],
    rating: p.rating || 0,
    numReviews: p.numReviews || 0,
    sold: p.sold_items || 0,
    seller: seller?.shopSlug || p.seller || '',
    sellerName: seller?.shopName || '',
    category: category?.slug || p.category || '',
    categoryName: category?.name || '',
  };
}

export function normalizeProductList(items) {
  return (items || []).map(normalizeProduct);
}

/** Flattens {name, slug, subcategory:[{name,slug,image}]}[] into a single
 * parent+child list with isParent/parent fields, matching what
 * Header/Listing/CategoryPage already expect from `/categories`. */
export function flattenCategories(categories) {
  const flat = [];
  (categories || []).forEach((c) => {
    flat.push({ _id: c._id, slug: c.slug, name: c.name, image: c.image || '', isParent: true, parent: '' });
    (c.subcategory || []).forEach((s) => {
      flat.push({ _id: s._id, slug: s.slug, name: s.name, image: s.image || '', isParent: false, parent: c.slug });
    });
  });
  return flat;
}

export function normalizeSeller(s) {
  if (!s) return s;
  return { ...s, slug: s.shopSlug, name: s.shopName, rating: s.ratings };
}
