/**
 * The "tali" (rope) motif: a loose hand-drawn line with one knot.
 * Reason: it is the product name drawn, and it carries the pink identity color
 * in a few places (hero, footer) so the accent stays rare.
 */
export default function Rope({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 240 24"
      fill="none"
      preserveAspectRatio="none"
      className={`text-accent-500 ${className}`}
    >
      <path
        d="M2 14c22-7 38 6 60 1s30-10 48-6c9 2 10 9 4 10s-7-8 2-10c18-4 30 8 52 4s38-9 70-2"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
