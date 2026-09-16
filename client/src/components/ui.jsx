import { Star } from 'lucide-react';

export function RatingStars({ value = 0, size = 14 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} color={i <= Math.round(value) ? '#f5a623' : '#d9d9e0'} fill={i <= Math.round(value) ? '#f5a623' : 'none'} />
      ))}
    </span>
  );
}

export function Price({ value }) {
  return <>৳{Number(value).toLocaleString('en-IN')}</>;
}

export function Spinner() {
  return <div className="spinner" role="status" aria-label="Loading" />;
}

export function SectionHead({ title, sub, action }) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {sub && <small>{sub}</small>}
      </div>
      {action}
    </div>
  );
}
