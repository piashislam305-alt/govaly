import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { useStore } from '../context/StoreContext.jsx';

export default function ProductCard({ p, compact = false }) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const nav = useNavigate();
  const fav = isWishlisted(p._id);

  return (
    <div className="pcard">
      <div className="pcard-media">
        <Link to={`/product/${p.slug}`} aria-label={p.name}>
          <img src={p.images?.[0] || '/favicon.svg'} alt={p.name} loading="lazy" style={p.stock === 0 ? { opacity: 0.55 } : undefined} />
        </Link>
        {p.stock === 0 && (
          <span className="pcard-off" style={{ background: '#555', left: '50%', transform: 'translateX(-50%)' }}>Stock Out</span>
        )}
        <div className={`pcard-favs${fav ? ' show' : ''}`}>
          <button
            className={`pcard-act${fav ? ' on' : ''}`}
            onClick={() => toggleWishlist(p)}
            aria-label="Wishlist"
            title="Wishlist"
          >
            <Heart size={15} fill={fav ? 'currentColor' : 'none'} />
          </button>
          <button
            className="pcard-act"
            onClick={() => {
              if (p.sizes?.length > 1) return nav(`/product/${p.slug}`);
              addToCart(p);
            }}
            aria-label="Add to cart"
            title="Add to cart"
          >
            <ShoppingBag size={15} />
          </button>
        </div>
      </div>
      <div className="pcard-body">
        <span className="pcard-brand">{(p.seller || 'govaly').replace(/-/g, ' ')}</span>
        <Link to={`/product/${p.slug}`} className="pcard-name">{p.name}</Link>
        <div className="pcard-price">
          <b>৳{p.price.toLocaleString('en-IN')}</b>
        </div>
        {p.rating > 0 && (
          <span className="rating-pill" style={{ marginTop: 4, width: 'fit-content' }}>
            <Star fill="currentColor" /> {p.rating.toFixed(1)}
          </span>
        )}
        {p.stock > 0 && p.stock < 12 && (
          <span style={{ color: 'var(--amber)', fontWeight: 700, fontSize: 11 }}>Only {p.stock} left!</span>
        )}
        {p.stock === 0 && <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: 11 }}>Out of stock</span>}
        {!compact && (
          <button
            className="btn btn-ghost btn-sm pcard-add"
            onClick={() => {
              if (p.sizes?.length > 1) return nav(`/product/${p.slug}`);
              addToCart(p);
            }}
          >
            <ShoppingBag size={14} /> Add to Cart
          </button>
        )}
      </div>
    </div>
  );
}
