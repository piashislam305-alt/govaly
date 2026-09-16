import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useStore } from '../context/StoreContext.jsx';
import ProductCard from '../components/ProductCard.jsx';

export default function Wishlist() {
  const { wishlist, user } = useStore();

  return (
    <div className="container">
      {!wishlist.length ? (
        <div className="empty">
          <Heart size={52} strokeWidth={1.4} style={{ margin: '0 auto 10px', color: 'var(--brand)' }} />
          <h3>Your wishlist is empty</h3>
          <p>Tap the ♥ on any product to save it here{user ? '' : ' (login to sync across devices)'}.</p>
          <Link to="/products" className="btn btn-primary" style={{ marginTop: 10 }}>Discover Products</Link>
        </div>
      ) : (
        <section className="section container" style={{ marginTop: 14 }}>
          <div className="section-head"><h2>My Wishlist <span className="mut" style={{ fontSize: 14 }}>({wishlist.length})</span></h2></div>
          <div className="grid">
            {wishlist.map((p) => <ProductCard p={p} key={p._id} compact />)}
          </div>
        </section>
      )}
    </div>
  );
}
