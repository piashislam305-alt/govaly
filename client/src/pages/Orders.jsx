import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Store, ChevronLeft, Menu, CheckCircle, MapPin, Truck, Ban, PackageCheck, PackageSearch } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { useStore } from '../context/StoreContext.jsx';
import { Spinner } from '../components/ui.jsx';

/* My Orders — full standard e-commerce status pipeline (Placed → Processing
 * → Shipped → Delivered, with Cancelled as a side-branch), a real
 * "Track Order" timeline pulled from the order's statusHistory, and
 * self-service cancellation while an order is still Placed/Processing. */
const TABS = ['All', 'Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const CANCELLABLE_FROM = ['Placed', 'Processing'];

const STEP_ICON = { Placed: PackageSearch, Processing: Package, Shipped: Truck, Delivered: PackageCheck };
const PIPELINE = ['Placed', 'Processing', 'Shipped', 'Delivered'];

function PinkStars({ value = 0, onPick, size = 22 }) {
  return (
    <span className="pstars" role={onPick ? 'radiogroup' : undefined} aria-label={onPick ? 'Rating' : `${value} star${value > 1 ? 's' : ''}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i} type="button" className="pstar" disabled={!onPick}
          onClick={() => onPick?.(i)}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
        >
          <svg width={size} height={size} viewBox="0 0 24 24" fill={i <= value ? '#e2136e' : '#f9d2e3'}>
            <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
          </svg>
        </button>
      ))}
    </span>
  );
}

/* per-item review form — posts to /customer/products/:productId/review */
function ReviewForm({ orderId, productId, onDone }) {
  const { toast } = useStore();
  const [rating, setRating] = useState(5);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/customer/products/${productId}/review`, { rating, description, orderId });
      toast('Review submitted — thanks! ⭐', 'ok');
      onDone();
    } catch (e) { toast(errMsg(e), 'err'); } finally { setBusy(false); }
  };

  return (
    <div className="rev-form">
      <div className="rev-row">
        <span className="rev-lab">Comment:</span>
        <textarea
          className="rev-comment" placeholder="Write a comment..." rows={3} maxLength={500}
          value={description} onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="rev-row" style={{ marginTop: 8 }}>
        <span className="rev-lab">Rating:</span>
        <PinkStars value={rating} onPick={setRating} />
      </div>
      <div className="rev-row" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
        <button type="button" className="rev-submit" disabled={busy} onClick={submit}>{busy ? 'Submitting…' : 'Submit Review'}</button>
      </div>
    </div>
  );
}

/* Track Order — pulls the real statusHistory from the backend and shows it
 * as a step timeline, rather than assuming a fixed set of steps happened. */
function TrackTimeline({ orderId, fallbackStatus }) {
  const [track, setTrack] = useState(null);

  useEffect(() => {
    let live = true;
    api.get(`/customer/orders/${orderId}/track`).then(({ data }) => live && setTrack(data.data)).catch(() => {});
    return () => { live = false; };
  }, [orderId]);

  if (!track) return <div className="track-timeline"><Spinner /></div>;

  const cancelled = track.status === 'Cancelled';
  const historyByStatus = Object.fromEntries((track.statusHistory || []).map((h) => [h.status, h.at]));
  const reachedIdx = PIPELINE.indexOf(track.status);

  return (
    <div className="track-timeline">
      {cancelled ? (
        <div className="track-cancelled">
          <Ban size={18} /> This order was cancelled
          {historyByStatus.Cancelled && <span className="mut"> on {new Date(historyByStatus.Cancelled).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
      ) : (
        <div className="track-steps">
          {PIPELINE.map((step, i) => {
            const Icon = STEP_ICON[step];
            const done = i <= reachedIdx;
            const at = historyByStatus[step];
            return (
              <div className={`track-step${done ? ' done' : ''}`} key={step}>
                <span className="track-dot"><Icon size={14} /></span>
                <span className="track-label">{step}</span>
                {at && <span className="track-time">{new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                {i < PIPELINE.length - 1 && <span className={`track-line${i < reachedIdx ? ' done' : ''}`} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrderCard({ o, onChanged }) {
  const { addToCart, toast } = useStore();
  const nav = useNavigate();
  const [reviewFor, setReviewFor] = useState(null); // item index
  const [tracking, setTracking] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const delivered = o.status === 'Delivered';
  const cancellable = CANCELLABLE_FROM.includes(o.status);

  const statusClass = {
    Placed: 'is-dark', Processing: 'is-dark', Shipped: 'is-dark',
    Delivered: 'is-pink', Cancelled: 'is-cancelled',
  }[o.status] || 'is-dark';

  const orderAgain = () => {
    o.items.forEach((it) => addToCart({
      _id: it.product?._id || it.product, slug: it.product?.slug, name: it.name, images: [it.image],
      price: it.price, seller: it.seller?.shopSlug, colors: it.color ? [it.color] : [],
      sizes: it.size ? [it.size] : [], stock: 50,
    }, it.size, it.quantity, true, it.color));
    toast('Items added back to your cart 🛒', 'ok');
    nav('/cart');
  };

  const cancelOrder = async () => {
    if (!window.confirm('Cancel this order? This can\'t be undone.')) return;
    setCancelling(true);
    try {
      await api.post(`/customer/orders/${o._id}/cancel`);
      toast('Order cancelled', 'ok');
      onChanged();
    } catch (e) { toast(errMsg(e), 'err'); } finally { setCancelling(false); }
  };

  return (
    <div className={`ocard${reviewFor !== null ? ' open' : ''}`}>
      <div className="ocard-head">
        <b className="ocard-id">Order #{o._id.slice(-8).toUpperCase()}</b>
        <span className="ocard-pays">
          <span className="opay opay-cod">Cash on Delivery</span>
          <span className={`ostatus ${statusClass}`}>{o.status}</span>
        </span>
      </div>

      <div className="ocard-items">
        {o.items.map((it, ix) => (
          <div key={ix}>
            <div className="ocard-item">
              <Link to={`/product/${it.product?.slug || ''}`}><img src={it.image} alt={it.name} /></Link>
              <div className="ocard-mid">
                <Link to={`/product/${it.product?.slug || ''}`} className="ocard-name">{it.name}</Link>
                <div className="ocard-chips">
                  <span className="ocard-chip">{[it.color && `Color: ${it.color}`, it.size && `Size: ${it.size}`].filter(Boolean).join(', ')}</span>
                  {it.seller?.shopName && <span className="ocard-seller"><Store size={11} /> {it.seller.shopName}</span>}
                </div>
              </div>
              <div className="ocard-right">
                <span className="ocard-price">৳{it.price}</span>
                <span className="ocard-qty">Quantity: {it.quantity}</span>
                <span className="ocard-amt">Amount: <b>৳{it.price * it.quantity}</b></span>
              </div>
            </div>
            {delivered && (
              <div className="row" style={{ padding: '0 12px 10px' }}>
                <button className="obtn obtn-pink" onClick={() => setReviewFor(reviewFor === ix ? null : ix)}>
                  {reviewFor === ix ? 'Close' : 'Add Review'}
                </button>
              </div>
            )}
            {reviewFor === ix && (
              <ReviewForm orderId={o._id} productId={it.product?._id || it.product} onDone={() => setReviewFor(null)} />
            )}
          </div>
        ))}
      </div>

      {tracking && <TrackTimeline orderId={o._id} fallbackStatus={o.status} />}

      <div style={{ padding: '0 12px 10px', fontSize: 12.5, color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
        <MapPin size={12} /> {o.deliveryInfo?.address}
      </div>

      <div className="ocard-foot">
        <div className="ocard-totals">
          <span className="ocard-total">Total: <b>৳{o.subtotal}</b></span>
        </div>
        <div className="ocard-btns">
          <button className="obtn obtn-line" onClick={() => setTracking((v) => !v)}>{tracking ? 'Hide Tracking' : 'Track Order'}</button>
          {delivered && <button className="obtn obtn-line" onClick={orderAgain}>Order Again</button>}
          {cancellable && <button className="obtn obtn-danger" onClick={cancelOrder} disabled={cancelling}>{cancelling ? 'Cancelling…' : 'Cancel Order'}</button>}
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [tab, setTab] = useState('All');
  const [menu, setMenu] = useState(false);
  const { user } = useStore();
  const nav = useNavigate();

  const load = () => api.get('/customer/orders').then(({ data }) => setOrders(data.data)).catch(() => setOrders([]));
  useEffect(() => { load(); }, []);

  if (!orders) return <Spinner />;

  const shown = tab === 'All' ? orders : orders.filter((o) => o.status === tab);

  return (
    <div className="orders-page">
      <div className="m-ord-head">
        <button className="m-back" onClick={() => nav(-1)} aria-label="Back"><ChevronLeft size={22} /></button>
        <b>My Orders</b>
        <button className={`m-burger${menu ? ' open' : ''}`} onClick={() => setMenu((v) => !v)} aria-label="Menu" aria-expanded={menu}><Menu size={16} /></button>
        {menu && (
          <div className="m-menu">
            <Link to="/profile" onClick={() => setMenu(false)}>👤 Profile</Link>
            <Link to="/wishlist" onClick={() => setMenu(false)}>❤️ Wishlist</Link>
            <Link to="/products" onClick={() => setMenu(false)}>🛍️ Shop Products</Link>
          </div>
        )}
      </div>
      <div className="m-user-strip">
        <span className="m-ava" aria-hidden="true">{(user?.name || 'U')[0].toUpperCase()}</span>
        <span className="m-name">{user?.name || 'User Name'} <CheckCircle size={13} strokeWidth={2.6} /></span>
      </div>

      <h2 className="dsk-only" style={{ margin: '0 2px 10px', fontSize: 22 }}>My Orders</h2>

      <div className="otabs">
        {TABS.map((t) => (
          <button key={t} className={`otab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="panel pf-empty" style={{ marginTop: 14 }}>
          <Package size={34} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--brand)', display: 'block' }} />
          No {tab !== 'All' ? tab.toLowerCase() + ' ' : ''}orders yet.
          <div style={{ marginTop: 12 }}>
            <Link to="/products" className="btn btn-primary btn-sm">Start Shopping</Link>
          </div>
        </div>
      ) : (
        shown.map((o) => <OrderCard key={o._id} o={o} onChanged={load} />)
      )}
    </div>
  );
}
