import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Banknote, CheckCircle2 } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { useStore } from '../context/StoreContext.jsx';
import Stepper from '../components/Stepper.jsx';

/* Real backend: Cash on Delivery is the ONLY payment method — no online gateway. */
export default function Payment() {
  const { cart, clearCart, toast } = useStore();
  const nav = useNavigate();
  const { state } = useLocation();
  const [busy, setBusy] = useState(false);

  const deliveryInfo = state?.deliveryInfo;

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery = subtotal >= 1500 ? 0 : subtotal > 0 ? 60 : 0;
  const total = subtotal + delivery;

  const confirmOrder = async () => {
    if (!deliveryInfo) { toast('Missing delivery details — go back to checkout', 'err'); return; }
    setBusy(true);
    try {
      const { data } = await api.post('/customer/checkout', {
        deliveryInfo,
        paymentMethod: 'cod',
      });
      clearCart();
      nav(`/order-success/${data.data._id}`);
    } catch (e) {
      toast(errMsg(e, 'Could not place order'), 'err');
      setBusy(false);
    }
  };

  if (!cart.length)
    return (
      <div className="container empty">
        <h3>Nothing to pay for</h3>
        <p>Your cart is empty.</p>
        <Link to="/products" className="btn btn-primary" style={{ marginTop: 10 }}>Start Shopping</Link>
      </div>
    );

  return (
    <div className="container cartflow">
      <button className="cart-back" onClick={() => nav('/checkout')}><span style={{ fontSize: 18 }}>‹</span> Payment</button>
      <Stepper current={3} />

      <div className="ck-grid">
        <div className="ck-left">
          <div className="panel panel-pad" style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 15.5, marginBottom: 10 }}>Payment Method</h3>
            <label className="panel pay-opt sel" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'default' }}>
              <input type="radio" name="paym" checked readOnly />
              <span className="pay-ico"><Banknote size={20} /></span>
              <span>
                <b style={{ display: 'block', fontSize: 14 }}>Cash on Delivery</b>
                <span className="mut" style={{ fontSize: 12.5 }}>Pay in cash when your parcel arrives — available all over Bangladesh.</span>
              </span>
            </label>
            <div className="mut" style={{ fontSize: 12.5, marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
              <CheckCircle2 size={14} color="#12a150" /> You will pay <b>৳{total.toLocaleString('en-IN')}</b> in cash on delivery.
            </div>
          </div>

          <div className="panel panel-pad">
            <h3 style={{ fontSize: 15.5, marginBottom: 8 }}>Deliver To</h3>
            {!deliveryInfo ? (
              <p className="mut" style={{ fontSize: 13 }}>No delivery details — go back to checkout.</p>
            ) : (
              <div style={{ fontSize: 13.5, lineHeight: 1.55 }}>
                <b>{deliveryInfo.fullName}</b> · {deliveryInfo.phone}
                <div className="mut">{deliveryInfo.address}</div>
              </div>
            )}
          </div>
        </div>

        <div className="ck-right">
          <div className="panel panel-pad">
            <h3 style={{ fontSize: 16, paddingBottom: 10, borderBottom: '1px solid var(--line)', marginBottom: 10 }}>Summary</h3>
            <div className="sumrow"><span>Items ({cart.reduce((s, i) => s + i.qty, 0)})</span><span>৳{subtotal.toLocaleString('en-IN')}</span></div>
            <div className="sumrow"><span>Delivery Fee</span><span>{delivery === 0 ? 'FREE' : `৳${delivery}`}</span></div>
            <div className="sumrow"><span>Payment Method</span><b>Cash on Delivery</b></div>
            <div className="sumrow total" style={{ fontSize: 16 }}>
              <span>Total Payable</span><span>৳{total.toLocaleString('en-IN')}</span>
            </div>
            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 14, borderRadius: 24, padding: '13px 16px', fontSize: 15.5 }}
              disabled={busy || !deliveryInfo}
              onClick={confirmOrder}
            >
              {busy ? 'Placing…' : 'Confirm Order'}
            </button>
            <p className="mut" style={{ fontSize: 11.5, textAlign: 'center', marginTop: 8 }}>Cash on Delivery — pay when you receive.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
