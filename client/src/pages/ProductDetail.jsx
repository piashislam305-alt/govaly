import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Truck, RotateCcw, ShieldCheck, ChevronRight, BadgePercent } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { normalizeProduct, normalizeProductList } from '../adapters.js';
import { useStore } from '../context/StoreContext.jsx';
import { RatingStars, Spinner } from '../components/ui.jsx';
import ProductCard from '../components/ProductCard.jsx';

const COLOR_HEX = {
  Black: '#22222a', 'Navy Blue': '#223a70', 'Olive Green': '#6b7a3f', Brown: '#7a4a2b',
  Maroon: '#7c1f3d', Pink: '#f2a0c5', Cream: '#f2e8d5', Red: '#d13438', 'Royal Blue': '#2551a5',
  Yellow: '#f2c230', 'Sky Blue': '#8ec9f0', Peach: '#f7b98e', White: '#f4f4f6',
  Green: '#3e9b4f',
};

export default function ProductDetail() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { addToCart, toggleWishlist, isWishlisted, user, toast } = useStore();

  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [size, setSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [color, setColor] = useState(null);

  const [revForm, setRevForm] = useState({ rating: 5, description: '' });
  const [revBusy, setRevBusy] = useState(false);

  const loadAll = () => {
    setData(null);
    setNotFound(false);
    setSize(null);
    setQty(1);
    setImgIdx(0);
    setColor(null);
    api
      .get(`/products/${slug}`)
      .then(({ data }) => {
        const product = normalizeProduct(data.data);
        return Promise.all([
          product,
          api.get(`/products/${slug}/reviews`).then((r) => r.data.data).catch(() => []),
          api.get('/products', { params: { category: product.category, limit: 8 } })
            .then((r) => normalizeProductList(r.data.items).filter((x) => x._id !== product._id))
            .catch(() => []),
        ]);
      })
      .then(([product, reviews, related]) => setData({ product, reviews, related }))
      .catch(() => setNotFound(true));
  };

  useEffect(loadAll, [slug]);

  if (notFound)
    return (
      <div className="container empty">
        <h3>Product not found</h3>
        <p>It may have been removed. <Link className="link-brand" to="/products">Continue shopping →</Link></p>
      </div>
    );
  if (!data) return <Spinner />;

  const { product: p, reviews, related } = data;
  const fav = isWishlisted(p._id);
  const needSize = (p.sizes?.length || 0) > 1;
  const chosenSize = size || p.sizes?.[0] || 'Free Size';
  const chosenColor = color || p.colors?.[0] || '';
  const gallery = (p.images?.length ? p.images : [p.images?.[0]]).filter(Boolean);

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      toast('Please login to leave a review', 'err');
      nav('/login', { state: { from: `/product/${p.slug}` } });
      return;
    }
    setRevBusy(true);
    try {
      await api.post(`/customer/products/${p._id}/review`, revForm);
      loadAll();
      setRevForm({ rating: 5, description: '' });
      toast('Thanks for your review! ⭐', 'ok');
    } catch (err) {
      toast(errMsg(err, 'Could not save review'), 'err');
    } finally {
      setRevBusy(false);
    }
  };

  const buyNow = () => {
    addToCart(p, chosenSize, qty, true, chosenColor);
    nav('/cart');
  };

  return (
    <div className="container">
      <div className="crumbs" style={{ padding: '12px 4px 0', color: 'var(--muted)', fontSize: 12.5 }}>
        <Link to="/">Home</Link> <ChevronRight size={11} style={{ display: 'inline' }} />
        <Link to={`/category/${p.category}`}>{p.categoryName || p.category.replace(/-/g, ' ')}</Link>
      </div>

      <div className="pdp">
        <div className="pdp-gallery">
          {gallery.length > 1 && (
            <div className="pdp-thumbs">
              {gallery.map((src, i) => (
                <button key={i} className={`pdp-thumb${imgIdx === i ? ' on' : ''}`} onClick={() => setImgIdx(i)} aria-label={`View image ${i + 1}`}>
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
          <div className="pdp-main-img">
            <img src={gallery[imgIdx] || gallery[0]} alt={p.name} />
          </div>
        </div>

        <div>
          <Link to={`/seller/${p.seller}`} className="pdp-brand">{(p.seller || 'govaly').replace(/-/g, ' ')}</Link>
          <h1 className="pdp-name">{p.name}</h1>
          <div className="row" style={{ gap: 10 }}>
            <span className="rating-pill"><span>★</span> {p.rating.toFixed(1)}</span>
            <span className="mut" style={{ fontSize: 12.5 }}>{p.numReviews} ratings · {p.sold}+ sold</span>
          </div>

          <div className="pdp-prices">
            <b>৳{p.price.toLocaleString('en-IN')}</b>
          </div>
          <div className="pdp-incl">Inclusive of all taxes</div>

          {p.colors?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <b style={{ fontSize: 13 }}>Select Color {chosenColor && <span className="mut" style={{ fontWeight: 500 }}>— {chosenColor}</span>}</b>
              <div className="swatches">
                {p.colors.map((c) => (
                  <button key={c} className={`swatch${chosenColor === c ? ' on' : ''}`} onClick={() => setColor(c)} aria-pressed={chosenColor === c}>
                    <i className="swatch-dot" data-c={c} style={{ background: COLOR_HEX[c] || '#d9d9e0' }} />
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {needSize && (
            <>
              <div className="spread" style={{ marginTop: 16 }}>
                <b style={{ fontSize: 13 }}>Select Size</b>
                <span className="link-brand" style={{ fontSize: 12, cursor: 'pointer' }}>Size Chart</span>
              </div>
              <div className="sizes">
                {p.sizes.map((s) => (
                  <button key={s} className={`size-chip${chosenSize === s ? ' on' : ''}`} onClick={() => setSize(s)}>{s}</button>
                ))}
              </div>
            </>
          )}

          <div className="row" style={{ gap: 14 }}>
            <b style={{ fontSize: 13 }}>Qty</b>
            <div className="qty">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
              <span>{qty}</span>
              <button onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Increase">+</button>
            </div>
            {p.stock < 12 && <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: 12.5 }}>Only {p.stock} left!</span>}
          </div>

          <div className="pdp-actions">
            <button className="btn btn-primary" style={{ flex: 1, minWidth: 170 }} onClick={() => addToCart(p, chosenSize, qty, false, chosenColor)}>
              <ShoppingBag size={17} /> ADD TO CART
            </button>
            <button className="btn btn-dark" style={{ flex: 1, minWidth: 140 }} onClick={buyNow}>⚡ BUY NOW</button>
            <button className={`btn btn-outline${fav ? '' : ''}`} style={{ minWidth: 52, padding: 11 }} onClick={() => toggleWishlist(p)} aria-label="Wishlist">
              <Heart size={17} fill={fav ? 'currentColor' : 'none'} color={fav ? 'var(--brand)' : undefined} />
            </button>
          </div>

          <div className="pdp-usp">
            <div><Truck size={16} /> Delivery within 48 hrs</div>
            <div><RotateCcw size={16} /> 7-day instant return</div>
            <div><ShieldCheck size={16} /> 100% authentic</div>
            <div><BadgePercent size={16} /> Cash on delivery</div>
          </div>
        </div>
      </div>

      <div className="pdp-sec">
        <h3>Product Details</h3>
        <p>{p.description}</p>
        <div className="row" style={{ marginTop: 14, gap: 18, flexWrap: 'wrap', color: 'var(--ink-2)', fontSize: 13 }}>
          <span><b>Seller:</b> {(p.seller || 'govaly').replace(/-/g, ' ')}</span>
          <span><b>Category:</b> {p.category.replace(/-/g, ' ')}</span>
          <span><b>SKU:</b> {p.slug.slice(0, 14).toUpperCase()}</span>
          <span><b>In stock:</b> {p.stock}</span>
        </div>
      </div>

      <div className="pdp-sec">
        <div className="spread" style={{ marginBottom: 8 }}>
          <h3>Reviews & Ratings ({p.numReviews})</h3>
          <div className="row"><RatingStars value={p.rating} size={16} /> <b>{p.rating.toFixed(1)}/5</b></div>
        </div>
        {reviews.map((r) => (
          <div className="review" key={r._id}>
            <div className="review-head">
              <RatingStars value={r.rating} size={12} />
              <span className="mut" style={{ fontSize: 12 }}>by {r.customer?.name || 'Customer'}</span>
              <time style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--muted)' }}>
                {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </time>
            </div>
            {r.description && <p>{r.description}</p>}
          </div>
        ))}

        {!user ? (
          <div className="rform">
            <b style={{ fontSize: 13.5 }}>Rate this product</b>
            <p className="mut" style={{ fontSize: 12.5, margin: '6px 0 10px' }}>Reviews are for verified buyers — please login to rate &amp; review.</p>
            <Link to="/login" state={{ from: `/product/${p.slug}` }} className="btn btn-primary btn-sm" style={{ justifySelf: 'start', textDecoration: 'none' }}>Login to review</Link>
          </div>
        ) : (
        <form className="rform" onSubmit={submitReview}>
          <b style={{ fontSize: 13.5 }}>{user ? `Rate this product, ${user.name.split(' ')[0]}` : 'Rate this product'}</b>
          <div className="star-pick">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                type="button"
                key={i}
                className={i <= revForm.rating ? 'on' : ''}
                onClick={() => setRevForm((f) => ({ ...f, rating: i }))}
                aria-label={`${i} star`}
              >
                <span style={{ fontSize: 24 }}>★</span>
              </button>
            ))}
          </div>
          <textarea rows={3} placeholder="Share your experience…" value={revForm.description} onChange={(e) => setRevForm((f) => ({ ...f, description: e.target.value }))} />
          <button className="btn btn-primary btn-sm" style={{ justifySelf: 'start' }} disabled={revBusy}>
            {revBusy ? 'Saving…' : 'Submit Review'}
          </button>
        </form>
        )}
      </div>

      {related.length > 0 && (
        <section className="section container" style={{ marginTop: 14 }}>
          <div className="section-head"><h2>You May Also Like</h2></div>
          <div className="grid">
            {related.slice(0, 10).map((r) => <ProductCard p={r} key={r._id} compact />)}
          </div>
        </section>
      )}
    </div>
  );
}
