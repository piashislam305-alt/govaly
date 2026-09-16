import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Store } from 'lucide-react';
import { useStore } from '../context/StoreContext.jsx';
import Stepper from '../components/Stepper.jsx';

/*
 * NOTE: the real backend has no saved-address-book concept (User just has a
 * single flat `address` string) — so unlike the old prototype, this is a
 * single inline delivery-info form filled in at checkout time, not a list
 * of saved addresses with add/edit/delete/make-default. Pre-filled from the
 * customer's profile where available.
 */
export default function Checkout() {
  const { cart, user, toast, setQty } = useStore();
  const nav = useNavigate();
  const [checked, setChecked] = useState({}); // key -> bool
  const [form, setForm] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });

  const keyOf = (i) => `${i.product}|${i.size}`;
  const isChecked = (i) => checked[keyOf(i)] !== false;
  const groups = [];
  cart.filter(isChecked).forEach((i) => {
    const g = i.seller || 'other';
    let grp = groups.find((x) => x.seller === g);
    if (!grp) { grp = { seller: g, name: i.sellerName, items: [] }; groups.push(grp); }
    grp.items.push(i);
  });
  const sellerLabel = (grp) => (grp.seller === 'other' ? 'Govaly Marketplace' : grp.name || grp.seller);

  const items = cart.filter(isChecked);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery = subtotal >= 1500 ? 0 : subtotal > 0 ? 60 : 0;
  const total = subtotal + delivery;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const formValid = form.fullName.trim() && form.phone.trim() && form.address.trim();

  if (!cart.length)
    return (
      <div className="container empty">
        <h3>Nothing to checkout</h3>
        <p>Your cart is empty — add some products first.</p>
      </div>
    );

  return (
    <div className="container cartflow">
      <button className="cart-back" onClick={() => nav('/cart')}><span style={{ fontSize: 18 }}>‹</span> Checkout</button>
      <Stepper current={2} />

      <div className="ck-grid">
        {/* LEFT */}
        <div>
          <div className="panel panel-pad" style={{ marginBottom: 12 }}>
            <b style={{ fontSize: 16.5, display: 'block', marginBottom: 10 }}>Delivery Details</b>
            <div className="form-grid">
              <div className="field"><label>Full Name*</label>
                <input required value={form.fullName} onChange={set('fullName')} placeholder="Enter your full name" /></div>
              <div className="field"><label>Phone Number*</label>
                <input required value={form.phone} onChange={set('phone')} placeholder="Enter your phone number" /></div>
            </div>
            <div className="field" style={{ marginTop: 4 }}><label>Full Address*</label>
              <input required value={form.address} onChange={set('address')} placeholder="House/Street/Area/City" /></div>
          </div>

          {/* item groups (selected) */}
          {groups.map((g) => {
            const gAll = g.items.every((i) => checked[keyOf(i)] !== false);
            return (
              <div className="panel" key={g.seller} style={{ marginTop: 12, overflow: 'hidden' }}>
                <label className="seller-head">
                  <input
                    type="checkbox" checked={gAll}
                    onChange={() => {
                      const next = !gAll;
                      setChecked((c) => { const m = { ...c }; g.items.forEach((i) => { m[keyOf(i)] = next; }); return m; });
                    }}
                  />
                  <Store size={15} color="var(--brand)" />
                  <b style={{ fontSize: 13.5 }}>{sellerLabel(g)}</b>
                </label>
                <div className="seller-table">
                  {g.items.map((i) => (
                    <div className="st-row" key={keyOf(i)}>
                      <div className="st-prod">
                        <input type="checkbox" checked={isChecked(i)} onChange={() => setChecked((c) => ({ ...c, [keyOf(i)]: !isChecked(i) }))} aria-label={`Select ${i.name}`} />
                        <img src={i.image} alt={i.name} />
                        <div>
                          <span className="st-name">{i.name}</span>
                          <span className="size-chip">{[i.color && `Color: ${i.color}`, i.size && `Size: ${i.size}`].filter(Boolean).join(', ')}</span>
                        </div>
                      </div>
                      <b className="st-price">৳{i.price * i.qty}</b>
                      <div className="st-actions">
                        <button className="trash" onClick={() => toast('Uncheck items or remove them from the Cart', 'err')} aria-label="Remove"><Trash2 size={16} /></button>
                        <span className="qty">
                          <button onClick={() => setQty(i.product, i.size, i.qty - 1)} aria-label="Decrease">−</button>
                          <span>{i.qty}</span>
                          <button onClick={() => setQty(i.product, i.size, i.qty + 1)} aria-label="Increase">+</button>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT */}
        <div className="ck-right">
          <div className="panel panel-pad" style={{ marginTop: 12 }}>
            <h3 style={{ fontSize: 16, marginBottom: 10 }}>Summary</h3>
            <div className="sumrow"><span>Product Price</span><span>৳{subtotal.toLocaleString('en-IN')}</span></div>
            <div className="sumrow"><span>Standard Delivery</span><span>{delivery === 0 ? <span className="free">FREE</span> : `৳${delivery}`}</span></div>
            <div className="sumrow total" style={{ fontSize: 16 }}>
              <span>Total Payable</span><span>৳{total.toLocaleString('en-IN')}</span>
            </div>
            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 14, borderRadius: 24, padding: '13px 16px', fontSize: 15.5 }}
              disabled={!items.length || !formValid}
              onClick={() => {
                if (!formValid) return toast('Please fill in your delivery details', 'err');
                nav('/payment', { state: { deliveryInfo: form, stamp: Date.now() } });
              }}
            >
              Place Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
