import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronRight } from 'lucide-react';
import api from '../api.js';
import { flattenCategories, normalizeProductList } from '../adapters.js';
import ProductCard from '../components/ProductCard.jsx';
import { Spinner } from '../components/ui.jsx';
import { useStore } from '../context/StoreContext.jsx';

const PRICE_BUCKETS = [
  { label: 'Under ৳500', min: 0, max: 499 },
  { label: '৳500 – ৳1000', min: 500, max: 1000 },
  { label: '৳1000 – ৳2000', min: 1000, max: 2000 },
  { label: '৳2000 – ৳5000', min: 2000, max: 5000 },
  { label: '৳5000 & above', min: 5000, max: undefined },
];
const SORTS = [
  ['popular', 'Popularity'], ['new', 'Newest first'],
  ['price_asc', 'Price: Low to High'], ['price_desc', 'Price: High to Low'], ['rating', 'Customer Rating'],
];

export default function Listing() {
  const { slug: catSlug } = useParams();
  const loc = useLocation();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const { toast } = useStore();

  const [cats, setCats] = useState([]);
  const [category, setCategory] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const search = sp.get('search') || '';
  const page = Number(sp.get('page')) || 1;
  const sort = sp.get('sort') || 'popular';
  const selCats = (sp.get('category') || '').split(',').filter(Boolean);
  const min = sp.get('min') || '';
  const max = sp.get('max') || '';
  const size = sp.get('size') || '';

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCats(flattenCategories(data.data))).catch(() => {});
  }, []);

  useEffect(() => {
    setCategory(null);
    if (catSlug) api.get(`/categories/${catSlug}`).then(({ data }) => setCategory(data.data)).catch(() => {});
  }, [catSlug]);

  const params = useMemo(() => {
    const p = { page, sort, limit: 24 };
    if (search) p.search = search;
    if (catSlug || selCats.length) p.category = catSlug || selCats.join(',');
    if (min) p.min = min;
    if (max) p.max = max;
    if (size) p.size = size;
    return p;
  }, [page, sort, search, catSlug, selCats.join(), min, max, size]);

  useEffect(() => {
    setLoading(true);
    api
      .get('/products', { params })
      .then(({ data }) => setData({ ...data, items: normalizeProductList(data.items) }))
      .catch(() => toast('Could not load products', 'err'))
      .finally(() => setLoading(false));
    window.scrollTo({ top: 0 });
  }, [params]);

  const patch = (obj, resetPage = true) => {
    const next = new URLSearchParams(sp);
    Object.entries(obj).forEach(([k, v]) => {
      if (v === '' || v == null) next.delete(k);
      else next.set(k, v);
    });
    if (resetPage) next.delete('page');
    setSp(next);
  };

  const toggleIn = (key, list, value) => {
    const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
    patch({ [key]: next.join(',') });
  };

  const activeChips = [
    ...selCats.map((c) => ({ label: cats.find((x) => x.slug === c)?.name || c, clear: () => toggleIn('category', selCats, c) })),
    ...(min || max ? [{ label: `৳${min || 0} – ৳${max || '∞'}`, clear: () => patch({ min: '', max: '' }) }] : []),
    ...(size ? [{ label: `Size: ${size}`, clear: () => patch({ size: '' }) }] : []),
    ...(search ? [{ label: `"${search}"`, clear: () => patch({ search: '' }) }] : []),
  ];

  const parents = cats.filter((c) => c.isParent);
  const childrenOf = (parentSlug) => cats.filter((c) => !c.isParent && c.parent === parentSlug);

  const title = category
    ? category.name
    : search
      ? `Results for "${search}"`
      : 'All Products';

  return (
    <div className="container">
      {category?.banner && (
        <div className="cat-banner"><img src={category.banner} alt={category.name} /></div>
      )}

      <div className="listing">
        <aside className={`filters${filtersOpen ? ' open' : ''}`}>
          <h5>Refine</h5>
          {activeChips.length > 0 && (
            <div className="fgroup">
              <h6>Applied</h6>
              <div className="chips" style={{ padding: 0 }}>
                {activeChips.map((c, i) => (
                  <button className="chip" key={i} onClick={c.clear}>{c.label} <X size={12} /></button>
                ))}
              </div>
            </div>
          )}

          <div className="fgroup">
            <h6>Categories</h6>
            {parents.map((p) => (
              <div key={p.slug} style={{ marginBottom: 4 }}>
                <Link
                  to={`/category/${p.slug}`}
                  style={{ display: 'block', fontWeight: 800, padding: '4px 0', color: p.slug === catSlug ? 'var(--brand)' : 'var(--ink)' }}
                >
                  {p.name}
                </Link>
                <div style={{ paddingLeft: 12, borderLeft: '2px solid var(--brand-100)', marginLeft: 2 }}>
                  {childrenOf(p.slug).map((c) => (
                    <Link
                      key={c.slug}
                      to={`/category/${c.slug}`}
                      style={{
                        display: 'block', fontSize: 12.8, padding: '3px 0',
                        color: c.slug === catSlug || selCats.includes(c.slug) ? 'var(--brand)' : 'var(--ink-2)',
                        fontWeight: c.slug === catSlug ? 700 : 500,
                      }}
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="fgroup">
            <h6>Price</h6>
            {PRICE_BUCKETS.map((b) => (
              <label key={b.label}>
                <input
                  type="radio"
                  name="price"
                  checked={String(b.min) === min && String(b.max ?? '') === max}
                  onChange={() => patch({ min: String(b.min), max: b.max ? String(b.max) : '' })}
                />
                {b.label}
              </label>
            ))}
            <label>
              <input type="radio" name="price" checked={!min && !max} onChange={() => patch({ min: '', max: '' })} />
              All prices
            </label>
          </div>

          <div className="fgroup">
            <h6>Size</h6>
            {['S', 'M', 'L', 'XL', 'XXL', 'Free Size', '39', '40', '41', '42', '43'].map((s) => (
              <label key={s}>
                <input type="checkbox" checked={size === s} onChange={() => patch({ size: size === s ? '' : s })} />
                {s}
              </label>
            ))}
          </div>
        </aside>

        <div className="listing-main">
          <div className="listing-top">
            <div className="crumbs">
              <Link to="/">Home</Link> <ChevronRight size={11} style={{ display: 'inline' }} /> <b>{title}</b>
              {data ? <span> — {data.total} items</span> : null}
            </div>
            <div className="row">
              <button className="btn btn-ghost btn-sm filter-toggle" onClick={() => setFiltersOpen((v) => !v)}>
                <SlidersHorizontal size={14} /> Filters
              </button>
              <select value={sort} onChange={(e) => patch({ sort: e.target.value })} aria-label="Sort products">
                {SORTS.map(([v, l]) => <option key={v} value={v}>Sort: {l}</option>)}
              </select>
              {filtersOpen && <button className="trash" onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X size={18} /></button>}
            </div>
          </div>

          {loading ? (
            <Spinner />
          ) : !data?.items?.length ? (
            <div className="empty">
              <h3>Nothing matched 😔</h3>
              <p>Try removing a filter or searching for something else.<br />
                Or browse <Link className="link-brand" to="/products">all products</Link>.</p>
            </div>
          ) : (
            <>
              <div className="grid">
                {data.items.map((p) => <ProductCard p={p} key={p._id} compact />)}
              </div>
              {data.pages > 1 && (
                <div className="pager">
                  <button disabled={page <= 1} onClick={() => patch({ page: String(page - 1) }, false)}>‹</button>
                  {Array.from({ length: Math.min(7, data.pages) }, (_, i) => {
                    const p = Math.max(1, Math.min(data.pages - 6, page - 3)) + i;
                    if (p > data.pages) return null;
                    return (
                      <button key={p} className={p === page ? 'on' : ''} onClick={() => patch({ page: String(p) }, false)}>
                        {p}
                      </button>
                    );
                  })}
                  <button disabled={page >= data.pages} onClick={() => patch({ page: String(page + 1) }, false)}>›</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
