import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Store } from 'lucide-react';
import api from '../api.js';
import { normalizeSeller, normalizeProductList } from '../adapters.js';
import ProductCard from '../components/ProductCard.jsx';
import { Spinner } from '../components/ui.jsx';

/**
 * Seller storefront page — a dedicated shop front for one seller, instead of
 * just re-using the generic filtered product listing.
 * ├── Banner + shop name + rating + product count
 * └── All of the seller's products
 *
 * NOTE: the real backend has no "group" concept, so this no longer has
 * per-group tabs the way an earlier version of this page did against the
 * old prototype server — it's just the seller's full catalog for now.
 */
export default function SellerPage() {
  const { slug } = useParams();
  const [seller, setSeller] = useState(null);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setNotFound(false);
    api.get(`/sellers/${slug}`).then(({ data }) => {
      if (!live) return;
      setSeller(normalizeSeller(data.data));
      setTotal(data.total || 0);
    }).catch(() => live && setNotFound(true))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [slug]);

  useEffect(() => {
    if (!seller) return;
    let live = true;
    api.get('/products', { params: { seller: seller._id, limit: 24 } })
      .then(({ data }) => live && setItems(normalizeProductList(data.items)));
    return () => { live = false; };
  }, [seller]);

  if (loading) return <Spinner />;
  if (notFound || !seller)
    return (
      <div className="container empty">
        <h3>Seller not found</h3>
        <p><Link className="link-brand" to="/products">Browse all products →</Link></p>
      </div>
    );

  return (
    <div className="container">
      <div className="seller-banner">
        <div className="seller-avatar">
          {seller.logo ? <img src={seller.logo} alt={seller.name} /> : <Store size={28} />}
        </div>
        <div>
          <h1 style={{ fontSize: 22, margin: 0 }}>{seller.name}</h1>
          <div className="row" style={{ gap: 10, marginTop: 4 }}>
            <span className="rating-pill"><Star size={13} /> {seller.rating?.toFixed(1) ?? '4.7'}</span>
            <span className="mut" style={{ fontSize: 12.5 }}>{total} products</span>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mut" style={{ padding: '20px 4px' }}>No products here yet.</p>
      ) : (
        <div className="grid" style={{ paddingTop: 18 }}>
          {items.map((p) => <ProductCard p={p} key={p._id} />)}
        </div>
      )}
    </div>
  );
}
