import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { flattenCategories, normalizeProductList } from '../adapters.js';
import ProductCard from '../components/ProductCard.jsx';
import { Spinner } from '../components/ui.jsx';

/* Customer home — simplified:
   ✅ sub-category cards from DB
   ✅ product browsing tabs (For You + one tab per top-level category)
   ❌ no hero, no USP strip, no top brands, no exclusive/promo deals, no flash sale, no campaigns
   NOTE: the real backend has no fixed Men/Women/Kids/Baby/Health&Beauty "group" —
   tabs are now whatever top-level categories actually exist in the DB. */

function ShopByCategory({ subs }) {
  if (!subs) return <Spinner />;
  if (!subs.length) return null;

  return (
    <section className="section container">
      <h3 className="sec-title" style={{ marginBottom: 12 }}>Shop by Category</h3>
      <div className="cat-scroll" style={{ flexWrap: 'wrap' }}>
        {subs.map((c) => (
          <Link className="cat-item" to={`/category/${c.slug}`} key={c.slug}>
            <span className="cat-imgwrap">
              <img src={c.image || '/favicon.svg'} alt={c.name} loading="lazy" />
            </span>
            <span>{c.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ProductTabs({ parents }) {
  const [tab, setTab] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const tabs = [{ key: '', label: 'For You' }, ...parents.map((p) => ({ key: p.slug, label: p.name }))];

  useEffect(() => {
    setLoading(true);
    api
      .get('/products', { params: { category: tab || undefined, limit: 12, sort: 'popular' } })
      .then(({ data }) => setItems(normalizeProductList(data.items)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <section className="section container" style={{ paddingBottom: 6 }}>
      <div className="tabs">
        {tabs.map((t) => (
          <button key={t.key} className={`tab${tab === t.key ? ' on' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      {loading ? (
        <Spinner />
      ) : (
        <div className="grid">
          {items.map((p) => <ProductCard p={p} key={p._id} compact />)}
        </div>
      )}
      <div className="center" style={{ padding: '2px 0 18px' }}>
        <Link className="btn btn-outline btn-sm" to={`/products${tab ? `?category=${tab}` : ''}`}>View All Products →</Link>
      </div>
    </section>
  );
}

export default function Home() {
  const [cats, setCats] = useState(null);

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCats(flattenCategories(data.data))).catch(() => setCats([]));
  }, []);

  if (!cats) return <Spinner />;
  const parents = cats.filter((c) => c.isParent);
  const subs = cats.filter((c) => !c.isParent);

  return (
    <>
      <ShopByCategory subs={subs} />
      <ProductTabs parents={parents} />
    </>
  );
}
