import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Store, ChevronLeft } from 'lucide-react';
import { useStore } from '../context/StoreContext.jsx';
import Stepper from '../components/Stepper.jsx';

export default function Cart() {
  const { cart, setQty, removeFromCart, cartSubtotal, user } = useStore();
  const nav = useNavigate();
  const [checked, setChecked] = useState({}); // key -> bool (default true)
  const [confirmRemove, setConfirmRemove] = useState(null); // { product, size, name } | null

  const keyOf = (i) => `${i.product}|${i.size}`;
  const isChecked = (i) => checked[keyOf(i)] !== false;
  const allChecked = cart.length > 0 && cart.every(isChecked);

  const groups = [];
  cart.forEach((i) => {
    const g = i.seller || 'other';
    let grp = groups.find((x) => x.seller === g);
    if (!grp) { grp = { seller: g, name: i.sellerName, items: [] }; groups.push(grp); }
    grp.items.push(i);
  });
  const sellerLabel = (grp) => (grp.seller === 'other' ? 'Govaly Marketplace' : grp.name || grp.seller);

  const checkedItems = cart.filter(isChecked);
  const checkedSubtotal = checkedItems.reduce((s, i) => s + i.price * i.qty, 0);

  if (!cart.length)
    return (
      <div className="container empty">
        <div style={{ fontSize: 54 }}>🛒</div>
        <h3>Your cart is empty</h3>
        <p>Fill it with something fabulous — deals are waiting!</p>
        <Link to="/products" className="btn btn-primary" style={{ marginTop: 10 }}>Start Shopping</Link>
      </div>
    );

  return (
    <div className="container cartflow">
      <button className="cart-back" onClick={() => nav(-1)}><ChevronLeft size={22} /> Cart</button>
      <Stepper current={1} />

      <div className="cart-grid">
        <div>
          {/* Select All */}
          <label className="panel panel-pad cart-selectall">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={() => {
                const next = !allChecked;
                const map = {};
                cart.forEach((i) => { map[keyOf(i)] = next; });
                setChecked(map);
              }}
            />
            <b style={{ fontSize: 14 }}>Select All</b>
          </label>

          {groups.map((g) => {
            const gAll = g.items.every(isChecked);
            return (
              <div className="panel" key={g.seller} style={{ marginTop: 12, overflow: 'hidden' }}>
                <label className="seller-head">
                  <input
                    type="checkbox"
                    checked={gAll}
                    onChange={() => {
                      const next = !gAll;
                      setChecked((c) => {
                        const m = { ...c };
                        g.items.forEach((i) => { m[keyOf(i)] = next; });
                        return m;
                      });
                    }}
                  />
                  <Store size={15} color="var(--brand)" />
                  <b style={{ fontSize: 13.5 }}>{sellerLabel(g)}</b>
                </label>
                <div className="seller-table">
                  {g.items.map((i) => (
                    <div className="st-row" key={keyOf(i)}>
                      <div className="st-prod">
                        <input
                          type="checkbox"
                          checked={isChecked(i)}
                          onChange={() => setChecked((c) => ({ ...c, [keyOf(i)]: !isChecked(i) }))}
                          aria-label={`Select ${i.name}`}
                        />
                        <Link to={`/product/${i.slug}`}><img src={i.image} alt={i.name} /></Link>
                        <div>
                          <Link to={`/product/${i.slug}`} className="st-name">{i.name}</Link>
                          <span className="size-chip">{[i.color && `Color: ${i.color}`, i.size && `Size: ${i.size}`].filter(Boolean).join(', ')}</span>
                          <b className="st-price st-price-m">৳{i.price}</b>
                        </div>
                      </div>
                      <b className="st-price st-price-d">৳{i.price}</b>
                      <div className="st-actions">
                        <button className="trash" onClick={() => setConfirmRemove({ product: i.product, size: i.size, name: i.name })} aria-label="Remove"><Trash2 size={16} /></button>
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

          {/* mobile total bar (like the Govaly app) */}
          <div className="cart-totalbar">
            <b>Total Product Price</b>
            <span>৳{checkedSubtotal.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Summary — Govaly cart step: just total + checkout */}
        <div className="panel panel-pad" style={{ position: 'sticky', top: 76, alignSelf: 'start' }}>
          <h3 style={{ fontSize: 16, paddingBottom: 10, borderBottom: '1px solid var(--line)', marginBottom: 10 }}>Summary</h3>
          <div className="sumrow total" style={{ fontSize: 14 }}>
            <span>Total Product Price</span><span>৳{checkedSubtotal.toLocaleString('en-IN')}</span>
          </div>
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 14, borderRadius: 22, padding: '13px 16px', fontSize: 15 }}
            disabled={!checkedItems.length}
            onClick={() => nav('/checkout', { state: { from: 'cart' } })}
          >
            Checkout
          </button>
          {!user && <p className="mut" style={{ fontSize: 11.5, margin: '8px 0 0', textAlign: 'center' }}>You'll login at checkout</p>}
        </div>
      </div>

      {confirmRemove && (
        <>
          <div className="drawer-veil" onClick={() => setConfirmRemove(null)} />
          <div className="confirm-modal">
            <b style={{ color: 'var(--brand)', fontSize: 15 }}>Are you sure?</b>
            <p className="mut" style={{ fontSize: 13, margin: '6px 0 14px' }}>
              You want to delete "{confirmRemove.name}" from your cart.
            </p>
            <div className="row" style={{ gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setConfirmRemove(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => { removeFromCart(confirmRemove.product, confirmRemove.size); setConfirmRemove(null); }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
