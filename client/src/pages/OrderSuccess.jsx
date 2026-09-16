import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Truck } from 'lucide-react';
import api from '../api.js';

/* Govaly fox mascot — pink fox, shades, scarf & shopping bag */
function FoxMascot() {
  return (
    <svg width="190" height="185" viewBox="0 0 190 185" fill="none" aria-hidden>
      {/* tail */}
      <path d="M138 118c18-4 30 4 30 18 0 12-10 22-24 20-8-1-14-6-16-12l10-26z" fill="#d31467" />
      <path d="M152 132c8 2 12 8 10 14" stroke="#8e0c45" strokeWidth="3" strokeLinecap="round" />
      {/* bag */}
      <path d="M42 128h34l-3 44H46l-4-44z" fill="#e2136e" />
      <path d="M52 128c0-8 4-13 8-13s8 5 8 13" stroke="#8e0c45" strokeWidth="3" fill="none" />
      <text x="59" y="156" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#fff" fontFamily="Inter, sans-serif">govaly</text>
      {/* arm to bag */}
      <path d="M78 122c-8 4-16 8-22 14" stroke="#b3114f" strokeWidth="9" strokeLinecap="round" />
      {/* body */}
      <path d="M74 96c22-8 44-6 54 6 8 10 8 30 2 44-14 10-40 10-56 2-8-16-8-40 0-52z" fill="#e2136e" />
      {/* scarf */}
      <path d="M72 96c16-8 40-8 54 2-2 8-10 12-26 12s-26-6-28-14z" fill="#b3114f" />
      {/* head */}
      <path d="M60 62c0-22 15-38 36-38s36 16 36 38c0 18-14 32-36 32S60 80 60 62z" fill="#e2136e" />
      {/* ears */}
      <path d="M66 34L58 12l22 10-14 12z" fill="#d31467" />
      <path d="M126 34l8-22-22 10 14 12z" fill="#d31467" />
      <path d="M67 30l-4-10 10 5-6 5zM125 30l4-10-10 5 6 5z" fill="#ffe2ef" />
      {/* shades */}
      <rect x="68" y="50" width="26" height="15" rx="5" fill="#3d0a20" />
      <rect x="98" y="50" width="26" height="15" rx="5" fill="#3d0a20" />
      <path d="M94 56h4" stroke="#3d0a20" strokeWidth="3" />
      <path d="M72 52l4-2M102 52l4-2" stroke="#ff8fc0" strokeWidth="2.5" strokeLinecap="round" />
      {/* muzzle */}
      <path d="M88 70c0-4 4-7 8-7s8 3 8 7-4 8-8 8-8-4-8-8z" fill="#fff4f8" />
      <circle cx="96" cy="69" r="2.6" fill="#3d0a20" />
      <path d="M96 72v3m0 0c-2 2-5 2-6 0m6 0c2 2 5 2 6 0" stroke="#3d0a20" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      {/* feet */}
      <path d="M84 146c0 5-4 8-9 8h20c-5 0-9-3-9-8h-2zM112 146c0 5-4 8-9 8h20c-5 0-9-3-9-8h-2z" fill="#b3114f" />
    </svg>
  );
}

export default function OrderSuccess() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    api.get(`/customer/orders/${orderId}`).then(({ data }) => setOrder(data.data)).catch(() => {});
  }, [orderId]);

  const eta = new Date();
  eta.setDate(eta.getDate() + 4);

  return (
    <div className="container ty-page">
      <FoxMascot />
      <div className="ty-title">
        <span className="ty-check">
          <svg width="17" height="14" viewBox="0 0 17 14" fill="none"><path d="M2 7.5L6.2 12L15 2" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <h2 style={{ margin: 0, fontSize: 30 }}>Thank You for Your Order</h2>
      </div>
      <p className="ty-sub">
        Your order has been confirmed, to track your parcel please <Link to="/orders" className="ty-link">click here</Link>
      </p>
      <p className="ty-order">Order <b>#{orderId?.slice(-8).toUpperCase()}</b></p>

      {order && (
        <div className="panel panel-pad ty-summary">
          <div className="ty-summary-row">
            <span>{order.items.length} item{order.items.length > 1 ? 's' : ''}</span>
            <b>৳{order.subtotal.toLocaleString('en-IN')}</b>
          </div>
          <div className="ty-summary-line" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <MapPin size={14} style={{ marginTop: 2, flexShrink: 0 }} color="var(--brand)" />
            <span className="mut" style={{ fontSize: 12.5, textAlign: 'left' }}>
              {order.deliveryInfo.fullName} · {order.deliveryInfo.phone}<br />{order.deliveryInfo.address}
            </span>
          </div>
          <div className="ty-summary-line" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Truck size={14} color="var(--brand)" />
            <span className="mut" style={{ fontSize: 12.5 }}>
              Estimated delivery by <b>{eta.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</b> — Cash on Delivery
            </span>
          </div>
        </div>
      )}

      <div className="row" style={{ gap: 10, marginTop: 4 }}>
        <Link to="/orders" className="btn btn-outline btn-sm">Track Order</Link>
        <Link to="/products" className="ty-back">Back to shopping</Link>
      </div>
    </div>
  );
}
