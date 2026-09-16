import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import api from '../api.js';
import { flattenCategories } from '../adapters.js';

/** White sub-navigation bar under the header: Home · Category▾ */
export default function SubNav() {
  const [cats, setCats] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCats(flattenCategories(data.data))).catch(() => {});
  }, []);

  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const parents = cats.filter((c) => c.isParent);
  const childrenOf = (slug) => cats.filter((c) => !c.isParent && c.parent === slug);

  return (
    <div className="hidden border-b border-gray-100 bg-white sm:block" ref={ref}>
      <div className="container-g flex items-center gap-6 py-2.5">
        <Link to="/" className={`text-[13px] font-medium hover:text-primary ${pathname === '/' ? 'text-primary' : 'text-ink'}`}>Home</Link>

        <div className="relative">
          <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-[13px] font-medium text-ink hover:text-primary">
            Category <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && parents.length > 0 && (
            <div className="absolute left-0 top-full z-40 mt-2 grid w-[560px] grid-cols-3 gap-5 rounded-xl border border-gray-100 bg-white p-5 shadow-pop">
              {parents.map((p) => (
                <div key={p.slug}>
                  <Link to={`/category/${p.slug}`} onClick={() => setOpen(false)} className="mb-1.5 block text-[13px] font-bold text-ink hover:text-primary">{p.name}</Link>
                  {childrenOf(p.slug).map((c) => (
                    <Link key={c.slug} to={`/category/${c.slug}`} onClick={() => setOpen(false)} className="block truncate py-0.5 text-[12px] text-inksoft hover:text-primary">{c.name}</Link>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <Link to="/products" className={`text-[13px] font-medium hover:text-primary ${pathname === '/products' ? 'text-primary' : 'text-ink'}`}>All Products</Link>
      </div>
    </div>
  );
}
