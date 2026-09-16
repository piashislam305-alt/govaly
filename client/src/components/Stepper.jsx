const STEPS = ['Shopping', 'Cart', 'Checkout', 'Payment'];

/** Govaly 4-step progress bar. `current` = 0-based index of the active step. */
export default function Stepper({ current = 1 }) {
  return (
    <div className="stepper">
      {STEPS.map((label, i) => (
        <div className="step" key={label}>
          <div className={`step-track${i <= current ? ' done' : ''}`} />
          <span className={`step-dot${i <= current ? ' done' : ''}${i === current ? ' now' : ''}`}>{i + 1}</span>
          <span className={`step-label${i <= current ? ' done' : ''}`}>{label}</span>
        </div>
      ))}
    </div>
  );
}
