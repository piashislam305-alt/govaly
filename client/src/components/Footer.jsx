import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube, Music2, MessageCircle, Banknote } from 'lucide-react';
import { Logo } from './Header.jsx';

/* Rebuilt with Tailwind utility classes (design borrowed from the reference
 * govaly-customer project) instead of the shared styles.css. Payment strip
 * stays honest to what this backend actually supports — Cash on Delivery
 * only, not the full bKash/card/etc. badge row the reference shows. */

const policies = [
  ['Return & Refund Policy', '/returns'],
  ['Shipping & Delivery Policy', '/shipping'],
  ['Privacy Policy', '/privacy'],
  ['Terms & Conditions', '/terms'],
];

const sellerLinks = [
  ['Become A Seller', '/terms'],
  ['Seller Policy', '/terms'],
  ['Product Policy', '/terms'],
];

const help = [
  ['Contact Us', '/contact'],
  ['FAQ', '/faq'],
  ['About Us', '/about'],
  ['Report a Product', '/report'],
];

const socials = [
  [Facebook, 'Facebook', 'https://facebook.com/govaly'],
  [Instagram, 'Instagram', 'https://instagram.com/govaly'],
  [Music2, 'TikTok', 'https://tiktok.com/@govaly'],
  [Youtube, 'YouTube', 'https://youtube.com/@govaly'],
  [MessageCircle, 'WhatsApp', 'https://wa.me/8801907104920'],
];

function Column({ title, links }) {
  return (
    <div>
      <p className="mb-3 text-[13px] font-bold text-ink">{title}</p>
      <ul className="space-y-2">
        {links.map(([label, to]) => (
          <li key={label}>
            <Link to={to} className="text-[12.5px] text-inksoft transition hover:text-primary">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="mt-8 bg-[#fbeef4] text-ink">
      <div className="container-g grid gap-8 py-8 md:grid-cols-[1.2fr_1fr_1fr_1fr_0.9fr]">
        <div>
          <Logo className="h-9 md:h-10" />
          <p className="mt-2 text-[11px] text-inksoft">Bangladesh's Favorite Online Fashion Mall</p>
          <p className="text-[11px] text-inksoft"><b>DBID</b> - 751626035</p>
        </div>

        <Column title="Govaly Policies" links={policies} />
        <Column title="Govaly Seller" links={sellerLinks} />
        <Column title="Help & Support" links={help} />

        <div>
          <p className="mb-3 text-[13px] font-bold text-ink">Social Links</p>
          <ul className="space-y-2">
            {socials.map(([Ic, label, href]) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[12.5px] text-inksoft transition hover:text-primary">
                  <Ic size={14} /> {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Payment strip — COD only, matches what checkout actually supports */}
      <div className="border-t border-[#f3d7e4]">
        <div className="container-g py-5">
          <p className="mb-3 text-[13px] font-bold text-ink">Payment Method</p>
          <span className="inline-flex items-center gap-1.5 rounded border border-[#c8ecd2] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#12a150]">
            <Banknote size={14} /> Cash on Delivery
          </span>
        </div>
      </div>

      <div className="border-t border-[#f3d7e4] py-4 text-center text-[12px] text-inksoft">
        © {new Date().getFullYear()} Govaly Limited
      </div>
    </footer>
  );
}
