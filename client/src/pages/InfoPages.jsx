import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, MessageCircle, Clock, Download } from 'lucide-react';
import { useStore } from '../context/StoreContext.jsx';

const wrap = { maxWidth: 860, margin: '18px auto 0', padding: '0 16px' };
const panel = { background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '26px 28px', marginBottom: 14 };
const h1 = { fontSize: 26, margin: '0 0 6px' };
const subStyle = { color: 'var(--muted)', margin: '0 0 18px' };
const h3 = { fontSize: 15.5, margin: '18px 0 6px' };
const p = { color: 'var(--ink-2)', lineHeight: 1.75, margin: '4px 0', fontSize: 14 };
const li = { color: 'var(--ink-2)', lineHeight: 1.8, fontSize: 14 };

function Head({ title, sub }) {
  return (
    <>
      <h1 style={h1}>{title}</h1>
      <p style={subStyle}>{sub}</p>
    </>
  );
}

function Faq({ items }) {
  return (
    <>
      {items.map(([q, a]) => (
        <details key={q} style={{ borderBottom: '1px solid var(--line)', padding: '12px 4px' }}>
          <summary style={{ fontWeight: 700, fontSize: 14, cursor: 'pointer', color: 'var(--ink)' }}>{q}</summary>
          <p style={{ ...p, marginTop: 8 }}>{a}</p>
        </details>
      ))}
    </>
  );
}

const PAGES = {
  about: {
    title: 'About Govaly',
    sub: "Shopping? Go Valy! — Bangladesh's favorite online fashion mall",
    body: (
      <>
        <p style={p}>
          Govaly is an online fashion marketplace in Bangladesh offering trendy fashion, footwear and
          lifestyle products for Men, Women, Kids, Baby and Health & Beauty — at the best prices, with
          Cash on Delivery across the country.
        </p>
        <h3 style={h3}>Our promise</h3>
        <ul style={{ paddingLeft: 20 }}>
          <li style={li}>100% authentic products from verified sellers</li>
          <li style={li}>Delivery within 48 hours, nationwide</li>
          <li style={li}>7-day instant return, no questions asked</li>
          <li style={li}>Simple, honest pricing — no gimmicks</li>
        </ul>
        <h3 style={h3}>Company</h3>
        <p style={p}>Govaly Marketplace Ltd. · Dhaka, Bangladesh · DBID - 751626035</p>
      </>
    ),
  },

  contact: {
    title: 'Contact Us',
    sub: 'We are here for you 24/7',
    body: <ContactBody />,
  },

  faq: {
    title: 'Frequently Asked Questions',
    sub: 'Everything about ordering, delivery & returns',
    body: (
      <Faq
        items={[
          ['How do I place an order?', 'Browse products, add to cart (choose size where needed), go to checkout, fill in your address and confirm. You will get an order ID instantly with live tracking.'],
          ['Is Cash on Delivery available?', 'Yes! COD is available all over Bangladesh. You pay when the delivery man hands you the parcel. bKash / Nagad on delivery and cards are also supported at checkout.'],
          ['How long does delivery take?', 'Most orders are delivered within 48 hours in Dhaka and major cities. Remote areas may take 2–4 days.'],
          ['What is the delivery charge?', 'Delivery is ৳60 flat — and completely FREE on orders over ৳1500.'],
          ['How do returns work?', 'You have 7 days from delivery to request a return. Keep the tag on and the packaging intact. Start the return from My Orders or via live chat.'],
          ['How can I cancel an order?', 'Orders in "Placed" or "Processing" status can be cancelled by yourself from My Orders → Cancel.'],
          ['How do I change my size after ordering?', 'Sizes can be changed before the order is packed — contact live chat with your order ID as soon as possible.'],
        ]}
      />
    ),
  },

  returns: {
    title: 'Returns & Refunds',
    sub: '7-day instant return — no questions asked',
    body: (
      <>
        <p style={p}>Every product on Govaly is covered by our 7-day return policy.</p>
        <h3 style={h3}>Eligibility</h3>
        <ul style={{ paddingLeft: 20 }}>
          <li style={li}>Request within 7 days of delivery</li>
          <li style={li}>Product unused, tags & original packaging intact</li>
          <li style={li}>Include all accessories/freebies that came with it</li>
        </ul>
        <h3 style={h3}>How to return</h3>
        <ul style={{ paddingLeft: 20 }}>
          <li style={li}>1. Open <Link className="link-brand" to="/orders">My Orders</Link> → select the order → request return, or use Live Chat</li>
          <li style={li}>2. Our rider picks the parcel up from your address (1–2 days)</li>
          <li style={li}>3. After a quick quality check your refund is confirmed</li>
        </ul>
        <h3 style={h3}>Refund method</h3>
        <p style={p}>
          COD orders → bKash/Nagad transfer or Govaly wallet balance. Online payments → refunded to the
          same method within 3–7 working days.
        </p>
      </>
    ),
  },

  shipping: {
    title: 'Shipping Policy',
    sub: 'Delivery within 48 hours, nationwide',
    body: (
      <>
        <h3 style={h3}>Coverage & timing</h3>
        <ul style={{ paddingLeft: 20 }}>
          <li style={li}>Dhaka & major cities: within 48 hours</li>
          <li style={li}>Other districts: 2–4 working days</li>
          <li style={li}>Orders placed after 6 PM are processed the next morning</li>
        </ul>
        <h3 style={h3}>Charges</h3>
        <ul style={{ paddingLeft: 20 }}>
          <li style={li}>Flat ৳60 per order</li>
          <li style={li}>FREE delivery on orders over ৳1500</li>
        </ul>
        <h3 style={h3}>Tracking</h3>
        <p style={p}>
          Every order shows a live status timeline (Placed → Confirmed → Packed → Shipped → Delivered) in{' '}
          <Link className="link-brand" to="/orders">My Orders</Link>.
        </p>
      </>
    ),
  },

  terms: {
    title: 'Terms & Conditions',
    sub: 'The rules that keep Govaly fair for everyone',
    body: (
      <>
        <p style={p}>By using Govaly you agree to these terms. Last updated: September 2026.</p>
        <h3 style={h3}>1. Orders & pricing</h3>
        <p style={p}>
          All prices are in Bangladeshi Taka (৳) and include VAT. Orders are confirmed after address
          verification; Govaly may cancel orders with invalid addresses or pricing errors (with full refund).
        </p>
        <h3 style={h3}>2. Accounts</h3>
        <p style={p}>You are responsible for your account credentials. One person may maintain a single customer account.</p>
        <h3 style={h3}>3. Returns</h3>
        <p style={p}>Returns follow the 7-day policy described on the Returns & Refunds page.</p>
        <h3 style={h3}>4. Acceptable use</h3>
        <p style={p}>Fraudulent orders, abuse of returns, or resale of returned items may lead to account suspension.</p>
        <h3 style={h3}>5. Liability</h3>
        <p style={p}>Govaly's liability for any order is limited to the amount paid for that order.</p>
      </>
    ),
  },

  privacy: {
    title: 'Privacy Policy',
    sub: 'Your data stays yours',
    body: (
      <>
        <p style={p}>We collect the minimum data needed to deliver your orders: name, phone, address, email, and order history.</p>
        <h3 style={h3}>How we use it</h3>
        <ul style={{ paddingLeft: 20 }}>
          <li style={li}>Processing & delivering your orders</li>
          <li style={li}>Order updates via SMS/phone</li>
          <li style={li}>Improving product recommendations & deals</li>
        </ul>
        <h3 style={h3}>What we never do</h3>
        <ul style={{ paddingLeft: 20 }}>
          <li style={li}>Sell your personal data to third parties</li>
          <li style={li}>Store your card numbers on our servers</li>
        </ul>
        <h3 style={h3}>Your controls</h3>
        <p style={p}>You can update your details anytime from <Link className="link-brand" to="/profile">Profile</Link>, or request deletion by contacting support.</p>
      </>
    ),
  },

  careers: {
    title: 'Careers at Govaly',
    sub: 'Help us build Bangladesh’s favorite fashion mall',
    body: (
      <>
        <p style={p}>We are a fast-growing e-commerce team in Dhaka. Current openings:</p>
        <ul style={{ paddingLeft: 20 }}>
          <li style={li}><b>Customer Support Executive</b> — night shift, English + Bangla</li>
          <li style={li}><b>React / Node.js Engineer</b> — 2+ years, MERN stack</li>
          <li style={li}><b>Category Manager (Fashion)</b> — sourcing & seller relations</li>
          <li style={li}><b>Digital Marketing Specialist</b> — Meta & Google campaigns</li>
        </ul>
        <p style={p}>
          Send your CV to <b>careers@govaly.test</b> with the role in the subject line.
        </p>
      </>
    ),
  },

  'become-a-seller': {
    title: 'Become a Seller',
    sub: 'Sell to millions of shoppers across Bangladesh',
    body: (
      <>
        <p style={p}>
          List your fashion, footwear, kids or beauty products on Govaly and reach customers in all 8
          divisions — with COD handled for you.
        </p>
        <h3 style={h3}>Why sell on Govaly</h3>
        <ul style={{ paddingLeft: 20 }}>
          <li style={li}>Zero listing fee — commission only when you sell</li>
          <li style={li}>Weekly bKash/bank settlements</li>
          <li style={li}>Seller dashboard with live sales analytics</li>
          <li style={li}>Govaly handles delivery & cash collection</li>
        </ul>
        <h3 style={h3}>Getting started</h3>
        <p style={p}>
          Email <b>seller@govaly.test</b> with your trade license and product catalog — our team responds
          within 2 working days.
        </p>
      </>
    ),
  },

  app: {
    title: 'Govaly Mobile App',
    sub: 'Get exciting deals in the app 📱',
    body: (
      <>
        <p style={p}>
          Shop faster with the Govaly app — order tracking notifications and one-tap
          reorder.
        </p>
        <a
          className="play-btn"
          style={{ marginTop: 14 }}
          href="https://play.google.com/store/apps/details?id=com.govaly.govalybd"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Download size={20} />
          <span>
            <small style={{ display: 'block', fontSize: 9, letterSpacing: 0.4, color: '#55555e' }}>GET IT ON</small>
            <b style={{ display: 'block', fontSize: 14, lineHeight: 1.1 }}>Google Play</b>
          </span>
        </a>
      </>
    ),
  },

  report: {
    title: 'Report a Product',
    sub: 'Help us keep Govaly authentic',
    body: <ReportBody />,
  },

  chat: {
    title: 'Live Chat',
    sub: 'Talk to Govaly Buddy — 24/7',
    body: (
      <>
        <p style={p}>
          Our live chat assistant is online around the clock. Tap the pink bubble at the bottom-right
          corner of any page to start chatting instantly.
        </p>
        <div className="row" style={{ ...p, gap: 8 }}>
          <Phone size={15} color="var(--brand)" /> Hotline: <b>16xxx</b> (9 AM – 11 PM)
        </div>
        <div className="row" style={{ ...p, gap: 8 }}>
          <Mail size={15} color="var(--brand)" /> support@govaly.test
        </div>
      </>
    ),
  },

  sitemap: {
    title: 'Sitemap',
    sub: 'Every page on Govaly',
    body: <SitemapBody />,
  },
};

function ContactBody() {
  const { toast } = useStore();
  const [f, setF] = useState({ name: '', email: '', msg: '' });
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginBottom: 18 }}>
        {[
          { icon: <Phone size={17} />, t: 'Hotline', s: '16xxx (9 AM – 11 PM)' },
          { icon: <Mail size={17} />, t: 'Email', s: 'support@govaly.test' },
          { icon: <MapPin size={17} />, t: 'Office', s: 'Banani, Dhaka, Bangladesh' },
          { icon: <Clock size={17} />, t: 'Live Chat', s: '24/7 — bubble bottom-right' },
        ].map((c) => (
          <div key={c.t} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 14 }}>
            <div className="row" style={{ color: 'var(--brand)', marginBottom: 4 }}>{c.icon}<b style={{ color: 'var(--ink)', fontSize: 13.5 }}>{c.t}</b></div>
            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{c.s}</span>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); toast('Message sent — we will reply within 24h ✉️', 'ok'); setF({ name: '', email: '', msg: '' }); }}
        style={{ display: 'grid', gap: 10, maxWidth: 520 }}
      >
        <div className="field"><label>Your name</label>
          <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="field"><label>Email</label>
          <input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div className="field"><label>Message</label>
          <textarea rows={4} required value={f.msg} onChange={(e) => setF({ ...f, msg: e.target.value })} /></div>
        <button className="btn btn-primary" style={{ justifySelf: 'start' }}>Send Message</button>
      </form>
    </>
  );
}

function ReportBody() {
  const { toast } = useStore();
  const [f, setF] = useState({ url: '', reason: 'Counterfeit / replica product', detail: '' });
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); toast('Report received — thank you! 🚩', 'ok'); setF({ url: '', reason: f.reason, detail: '' }); }}
      style={{ display: 'grid', gap: 10, maxWidth: 520 }}
    >
      <div className="field"><label>Product link or name *</label>
        <input required value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="e.g. /product/panda-comfortable-white-sneaker" /></div>
      <div className="field"><label>Reason</label>
        <select value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })}>
          <option>Counterfeit / replica product</option>
          <option>Wrong item delivered</option>
          <option>Damaged on arrival</option>
          <option>Price / description mismatch</option>
          <option>Prohibited item</option>
        </select></div>
      <div className="field"><label>Details</label>
        <textarea rows={4} value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} /></div>
      <button className="btn btn-primary" style={{ justifySelf: 'start' }}>Submit Report</button>
    </form>
  );
}

function SitemapBody() {
  const groups = [
    ['Shopping', [['Home', '/'], ['All Products', '/products'], ['Categories', '/products']]],
    ['Account', [['Login', '/login'], ['Register', '/register'], ['Profile', '/profile'], ['Wishlist', '/wishlist'], ['Cart', '/cart']]],
    ['Orders', [['My Orders', '/orders'], ['Checkout', '/checkout']]],
    ['Help', [['Contact', '/contact'], ['FAQ', '/faq'], ['Returns & Refunds', '/returns'], ['Shipping Policy', '/shipping'], ['Live Chat', '/chat'], ['Report a Product', '/report']]],
    ['Company', [['About Us', '/about'], ['Careers', '/careers'], ['Become a Seller', '/become-a-seller'], ['Govaly App', '/app'], ['Terms', '/terms'], ['Privacy', '/privacy']]],
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 20 }}>
      {groups.map(([t, links]) => (
        <div key={t}>
          <h3 style={{ ...h3, marginTop: 0, color: 'var(--brand)' }}>{t}</h3>
          {links.map(([l, to]) => <div key={l}><Link to={to} style={{ ...li, display: 'block' }}>{l}</Link></div>)}
        </div>
      ))}
    </div>
  );
}

export default function InfoPage({ page }) {
  const def = PAGES[page];
  if (!def) return null;
  return (
    <div style={wrap}>
      <div style={panel}>
        <Head title={def.title} sub={def.sub} />
        {def.body}
      </div>
    </div>
  );
}
