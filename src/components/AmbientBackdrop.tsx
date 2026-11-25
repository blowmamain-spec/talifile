/**
 * Subtle editorial paper backdrop for the top of every page:
 * a faded drafting dot grid paired with slow-flowing rope threads echoing the TaliFile mark.
 * Pure CSS/SVG, zero JS frame loops, and automatically paused under prefers-reduced-motion.
 */
export default function AmbientBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[440px] overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 60%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 60%, transparent 100%)',
      }}
    >
      {/* Fine drafting dot matrix faded toward the outer edges */}
      <div
        className="paper-dots absolute inset-0 opacity-75"
        style={{
          maskImage: 'radial-gradient(ellipse 75% 85% at 55% 15%, #000 10%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 85% at 55% 15%, #000 10%, transparent 80%)',
        }}
      />

      {/* Slow-flowing rope lines anchored to the upper canvas */}
      <svg
        viewBox="0 0 1440 420"
        fill="none"
        preserveAspectRatio="xMidYMin slice"
        className="animate-paper-drift absolute inset-0 h-full w-full"
      >
        {/* Primary warm green thread */}
        <path
          d="M-60 92 C 210 18, 430 176, 720 112 C 980 54, 1180 184, 1500 96"
          stroke="var(--color-brand-500)"
          strokeOpacity="0.16"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M-60 92 C 210 18, 430 176, 720 112 C 980 54, 1180 184, 1500 96"
          stroke="var(--color-brand-500)"
          strokeOpacity="0.34"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="18 142"
          className="animate-rope-flow"
        />

        {/* Secondary pink identity thread with a loose loop on the right */}
        <path
          d="M-40 218 C 260 282, 540 120, 860 212 C 1030 260, 1110 162, 1055 152 C 1008 144, 1020 226, 1135 230 C 1265 234, 1360 170, 1500 198"
          stroke="var(--color-accent-500)"
          strokeOpacity="0.14"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M-40 218 C 260 282, 540 120, 860 212 C 1030 260, 1110 162, 1055 152 C 1008 144, 1020 226, 1135 230 C 1265 234, 1360 170, 1500 198"
          stroke="var(--color-accent-500)"
          strokeOpacity="0.32"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="14 146"
          className="animate-rope-flow-reverse"
        />

        {/* Subtle print registration crosshairs on the far edges */}
        <g stroke="var(--color-ink)" strokeOpacity="0.12" strokeWidth="1">
          <path d="M1180 68h12m-6-6v12" />
          <path d="M1260 278h10m-5-5v10" />
          <path d="M190 282h10m-5-5v10" />
        </g>
      </svg>
    </div>
  )
}
