import { useId } from 'react';
import type { SkyTheme } from '../theme';

interface Props {
  theme: SkyTheme;
  className?: string;
  /** Hills at the bottom give the scene a horizon. Off for small panels. */
  horizon?: boolean;
}

/**
 * The moving backdrop: sun or moon, drifting clouds, and whatever is falling.
 * It is decorative, and it is driven by the same `SkyTheme` the panel colours
 * come from, so the picture and the palette can never describe different
 * weather.
 *
 * The viewBox is deliberately wide. These panels are wide and short, and
 * `slice` scales by the larger ratio — a square-ish viewBox was being blown up
 * nearly 2x, which turned the clouds into blobs.
 *
 * Animation is CSS on groups, in user units rather than percentages, because
 * a percentage transform inside SVG resolves against a reference box that
 * differs between browsers. All of it stops under `prefers-reduced-motion`.
 */

const CLOUD = 'M14 26 q0 -12 12 -12 q4 -10 15 -10 q13 0 15 12 q11 1 11 10 q0 10 -12 10 h-29 q-12 0 -12 -10 z';

const STARS = [
  [46, 44, 1.8], [118, 26, 1.3], [186, 62, 1.6], [252, 34, 1.2], [318, 70, 1.9],
  [386, 28, 1.4], [452, 54, 1.6], [520, 32, 1.2], [590, 66, 1.7], [668, 40, 1.4],
  [742, 72, 1.5], [86, 96, 1.2], [274, 104, 1.4], [498, 110, 1.3], [770, 22, 1.2],
];

/** x positions for whatever is falling, with a per-drop delay so the field
 *  never pulses in unison. */
const DROPS = [
  24, 74, 124, 174, 224, 274, 324, 374, 424, 474, 524, 574, 624, 674, 724, 774,
];

export default function SkyScene({ theme, className, horizon = true }: Props) {
  const uid = useId().replace(/:/g, '');
  const skyId = `sky-${uid}`;
  const glowId = `glow-${uid}`;
  const night = theme.isNight;
  const falling = theme.kind === 'rain' ? 'rain' : theme.kind === 'snow' ? 'snow' : null;

  return (
    <svg
      className={`wf-scene ${className ?? ''}`}
      viewBox="0 0 800 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.from} />
          <stop offset="100%" stopColor={theme.to} />
        </linearGradient>
        <radialGradient id={glowId}>
          <stop offset="0%" stopColor={theme.glow} stopOpacity="0.9" />
          <stop offset="45%" stopColor={theme.glow} stopOpacity="0.3" />
          <stop offset="100%" stopColor={theme.glow} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="800" height="300" fill={`url(#${skyId})`} />

      {night && (
        <g>
          {STARS.map(([x, y, r], i) => (
            <circle
              key={`${x}-${y}`}
              cx={x} cy={y} r={r}
              fill="#FFFFFF"
              className="wf-twinkle"
              style={{ animationDelay: `${(i % 7) * 0.55}s` }}
            />
          ))}
        </g>
      )}

      {/* The light source sits high and to the right, away from the text. */}
      <g>
        <circle cx={646} cy={74} r={132} fill={`url(#${glowId})`} />
        {night ? (
          <path
            d="M660 38 a34 34 0 1 0 26 56 a28 28 0 1 1 -26 -56 z"
            fill={theme.glow}
            opacity="0.94"
          />
        ) : (
          <circle cx={646} cy={74} r={34} fill={theme.glow} opacity="0.95" />
        )}
      </g>

      {horizon && (
        <g>
          <path
            d="M0 236 q110 -52 220 -10 q100 38 198 -4 q104 -44 210 6 q78 30 172 8 v64 h-800 z"
            fill={theme.from}
            opacity="0.4"
          />
          <path
            d="M0 266 q134 -38 268 -6 q116 28 236 -8 q134 -40 296 10 v38 h-800 z"
            fill={theme.from}
            opacity="0.6"
          />
        </g>
      )}

      {/* Three cloud banks at different sizes, speeds and opacities. Depth is
          what stops it looking like stickers on a gradient. */}
      <g className="wf-drift wf-drift--slow" style={{ opacity: night ? 0.26 : 0.5 }}>
        <path d={CLOUD} fill="#FFFFFF" transform="translate(60 44) scale(1.7)" />
      </g>
      <g className="wf-drift wf-drift--mid" style={{ opacity: night ? 0.2 : 0.38 }}>
        <path d={CLOUD} fill="#FFFFFF" transform="translate(360 128) scale(2.2)" />
      </g>
      <g className="wf-drift wf-drift--fast" style={{ opacity: night ? 0.14 : 0.28 }}>
        <path d={CLOUD} fill="#FFFFFF" transform="translate(180 196) scale(1.2)" />
      </g>

      {falling && (
        <g>
          {DROPS.map((x, i) => (
            <g
              key={x}
              className={falling === 'rain' ? 'wf-rain' : 'wf-snow'}
              style={{
                animationDelay: `${(i % 5) * 0.38 + (i % 3) * 0.17}s`,
                animationDuration: falling === 'rain'
                  ? `${1.2 + (i % 4) * 0.24}s`
                  : `${3.6 + (i % 4) * 0.7}s`,
              }}
            >
              {falling === 'rain' ? (
                <line
                  x1={x} y1={-22} x2={x - 6} y2={2}
                  stroke="#FFFFFF" strokeOpacity="0.65" strokeWidth="2.6" strokeLinecap="round"
                />
              ) : (
                <circle cx={x} cy={-12} r={3.2} fill="#FFFFFF" fillOpacity="0.85" />
              )}
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
