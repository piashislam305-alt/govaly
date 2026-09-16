import { useEffect, useState, useCallback } from 'react';
import { Box, IndianRupee, Users, Package, Plus, Pencil, Trash2, Search } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { useStore } from '../context/StoreContext.jsx';
import { Spinner } from '../components/ui.jsx';

const STATUSES = ['Placed', 'Processing', 'Delivered', 'Cancelled'];
const CATEGORIES = [
  ['women-fashion-wear', 'women'], ['women-bottom-wear', 'women'], ['women-footwear', 'women'], ['women-fashion-accessories', 'women'],
  ['men-topwear', 'men'], ['men-bottomwear', 'men'], ['men-footwear', 'men'], ['men-fashion-accessories', 'men'],
  ['kids-kurti', 'kids'], ['kids-girls-clothing', 'kids'], ['kids-boys-clothing', 'kids'], ['kids-accessories', 'kids'], ['kids-footwear', 'kids'],
  ['baby-clothing-set', 'baby'], ['baby-shoes', 'baby'], ['baby-accessories', 'baby'], ['baby-winter-wear', 'baby'],
  ['health-beauty', 'health-beauty'],
];

const empty = { name: '', category: 'men-footwear', price: '', mrp: '', stock: 25, sizes: '', description: '', trending: false, featured: false };

export default function Admin() {
  const { toast } = useStore();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null); // {mode:'new'|'edit', data}
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    const [s, p, o] = await Promise.all([api.get('/admin/stats'), api.get('/admin/products'), api.get('/admin/orders')]);
    setStats(s.data); setProducts(p.data.items); setOrders(o.data.orders);
  }, []);

  useEffect(() => { loadAll().catch(() => toast('Failed to load admin data', 'err')); }, [loadAll]);

  const saveProduct = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      ...modal.data,
      price: Number(modal.data.price), mrp: Number(modal.data.mrp || modal.data.price), stock: Number(modal.data.stock),
      sizes: modal.data.sizes ? String(modal.data.sizes).split(',').map((s) => s.trim()).filter(Boolean) : [],
    };
    try {
      if (modal.mode === 'new') await api.post('/admin/products', payload);
      else await api.put(`/admin/products/${modal.data._id}`, payload);
      toast(modal.mode === 'new' ? 'Product created ✓' : 'Product updated ✓', 'ok');
      setModal(null);
      loadAll();
    } catch (e2) {
      toast(errMsg(e2), 'err');
    } finally {
      setBusy(false);
    }
  };

  const delProduct = async (p) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    await api.delete(`/admin/products/${p._id}`);
    toast('Product deleted', 'ok');
    loadAll();
  };

  const setStatus = async (orderId, status) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status });
      toast(`${orderId} → ${status}`, 'ok');
      loadAll();
    } catch (e) {
      toast(errMsg(e), 'err');
    }
  };

  if (!stats) return <Spinner />;

  return (
    <div className="container">
      <div className="spread" style={{ margin: '18px 4px 12px', flexWrap: 'wrap', gap: 10 }}>
        <h2>Admin Dashboard</h2>
        <div className="tabs" style={{ padding: 0 }}>
          {[['overview', 'Overview'], ['products', 'Products'], ['orders', 'Orders']].map(([k, l]) => (
            <button key={k} className={`tab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <>
          <div className="admin-grid">
            <div className="stat"><div className="stat-ico" style={{ background: 'var(--brand)' }}><Box size={22} /></div><div><b>{stats.totalProducts}</b><span>Products</span></div></div>
            <div className="stat"><div className="stat-ico" style={{ background: '#6b2fbf' }}><Package size={22} /></div><div><b>{stats.totalOrders}</b><span>Orders</span></div></div>
            <div className="stat"><div className="stat-ico" style={{ background: 'var(--green)' }}><Users size={22} /></div><div><b>{stats.users}</b><span>Customers</span></div></div>
            <div className="stat"><div className="stat-ico" style={{ background: 'var(--amber)' }}><IndianRupee size={22} /></div><div><b>৳{Number(stats.revenue).toLocaleString('en-IN')}</b><span>Revenue</span></div></div>
          </div>

          <div className="row" style={{ gap: 8, margin: '16px 0', flexWrap: 'wrap' }}>
            {Object.entries(stats.byStatus).map(([s, c]) => (
              <span key={s} className={`status-chip st-${s.toLowerCase()}`}>{s}: {c}</span>
            ))}
          </div>

          <div className="panel">
            <div className="panel-pad" style={{ paddingBottom: 6 }}><h3 style={{ fontSize: 15 }}>Recent Orders</h3></div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
                <tbody>
                  {stats.recentOrders.map((o) => (
                    <tr key={o.orderId}>
                      <td><b>{o.orderId}</b></td>
                      <td>{new Date(o.createdAt).toLocaleDateString('en-GB')}</td>
                      <td>{o.address?.fullName || '—'}</td>
                      <td>৳{o.total.toLocaleString('en-IN')}</td>
                      <td><span className={`status-chip st-${o.status.toLowerCase()}`}>{o.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'products' && (
        <div className="panel">
          <div className="panel-pad spread" style={{ flexWrap: 'wrap', gap: 10, paddingBottom: 10 }}>
            <div className="row" style={{ flex: 1, minWidth: 220 }}>
              <div className="nav-search" style={{ maxWidth: 340 }}>
                <input placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
                <button type="button"><Search size={16} /></button>
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setModal({ mode: 'new', data: { ...empty } })}>
              <Plus size={15} /> Add Product
            </button>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Sold</th><th>Actions</th></tr></thead>
              <tbody>
                {products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 60).map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <img src={p.images?.[0]} alt="" />
                        <div>
                          <b style={{ fontSize: 12.5 }}>{p.name.length > 44 ? p.name.slice(0, 44) + '…' : p.name}</b>
                          <div className="mut" style={{ fontSize: 11 }}>{p.seller} {p.trending ? '· 🔥 trending' : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>{p.category}</td>
                    <td><b>৳{p.price}</b></td>
                    <td>{p.stock}</td>
                    <td>{p.sold}</td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <button className="pcard-act" title="Edit" onClick={() => setModal({ mode: 'edit', data: { ...p, sizes: (p.sizes || []).join(', ') } })}><Pencil size={14} /></button>
                        <button className="pcard-act" title="Delete" style={{ color: '#c22' }} onClick={() => delProduct(p)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="panel">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Payment</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.orderId}>
                    <td>
                      <b>{o.orderId}</b>
                      <div className="mut" style={{ fontSize: 11 }}>{new Date(o.createdAt).toLocaleDateString('en-GB')}</div>
                    </td>
                    <td style={{ fontSize: 12.5 }}>{o.address?.fullName}<div className="mut" style={{ fontSize: 11 }}>{o.address?.phone}</div></td>
                    <td style={{ fontSize: 12 }}>{o.items.length}</td>
                    <td style={{ fontSize: 12, textTransform: 'uppercase' }}>{o.payment.method}</td>
                    <td><b>৳{o.total.toLocaleString('en-IN')}</b></td>
                    <td>
                      <select value={o.status} onChange={(e) => setStatus(o.orderId, e.target.value)}>
                        {STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-veil" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <form className="modal" onSubmit={saveProduct}>
            <h3>{modal.mode === 'new' ? 'Add Product' : 'Edit Product'}</h3>
            <div className="form-grid">
              <div className="field full"><label>Product Name *</label>
                <input required value={modal.data.name} onChange={(e) => setModal({ ...modal, data: { ...modal.data, name: e.target.value } })} /></div>
              <div className="field"><label>Category</label>
                <select value={modal.data.category} onChange={(e) => setModal({ ...modal, data: { ...modal.data, category: e.target.value } })}>
                  {CATEGORIES.map(([c]) => <option key={c} value={c}>{c}</option>)}
                </select></div>
              <div className="field"><label>Price (৳) *</label>
                <input type="number" required min="1" value={modal.data.price} onChange={(e) => setModal({ ...modal, data: { ...modal.data, price: e.target.value } })} /></div>
              <div className="field"><label>MRP (৳)</label>
                <input type="number" min="1" value={modal.data.mrp} onChange={(e) => setModal({ ...modal, data: { ...modal.data, mrp: e.target.value } })} /></div>
              <div className="field"><label>Stock</label>
                <input type="number" min="0" value={modal.data.stock} onChange={(e) => setModal({ ...modal, data: { ...modal.data, stock: e.target.value } })} /></div>
              <div className="field"><label>Sizes (comma separated)</label>
                <input placeholder="S, M, L or 40, 41, 42" value={modal.data.sizes || ''} onChange={(e) => setModal({ ...modal, data: { ...modal.data, sizes: e.target.value } })} /></div>
              <div className="field full"><label>Description</label>
                <textarea rows={3} value={modal.data.description || ''} onChange={(e) => setModal({ ...modal, data: { ...modal.data, description: e.target.value } })} /></div>
              <label className="row"><input type="checkbox" checked={!!modal.data.trending} onChange={(e) => setModal({ ...modal, data: { ...modal.data, trending: e.target.checked } })} /> Trending</label>
              <label className="row"><input type="checkbox" checked={!!modal.data.featured} onChange={(e) => setModal({ ...modal, data: { ...modal.data, featured: e.target.checked } })} /> Featured</label>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Saving…' : modal.mode === 'new' ? 'Create Product' : 'Save Changes'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
