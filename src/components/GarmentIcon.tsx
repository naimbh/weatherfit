import type { ReactNode } from 'react';
import type { Garment, GarmentId } from '../types';
import { fabric } from '../theme';

interface Props {
  id: GarmentId;
  tone: Garment['tone'];
  size?: number;
  className?: string;
  label?: string;
}

/**
 * One drawing per garment, in the same three-value shading the figure uses:
 * the cloth, a shadow on the right, and the trim that catches the light.
 *
 * These carry the clothing wherever the figure is too big to repeat — the
 * piece list beside it, the change timeline, the hour rail. A row of names
 * with no pictures is a list; a row with pictures is an outfit.
 *
 * Drawn on a 64 x 64 grid with the light coming from the left, matching
 * figureParts.ts, so an icon and the figure never disagree about a garment.
 */

const T = 'var(--g-base)';
const S = 'var(--g-shade)';
const L = 'var(--g-light)';

const P = (d: string, fill = T, extra: Record<string, unknown> = {}) => ({ d, fill, ...extra });

type Piece = ReturnType<typeof P>;

/** A shirt body with a crew neckline, used by every top. */
const BODY = 'M23 14 q9 8 18 0 v38 q0 2 -2 2 h-14 q-2 0 -2 -2 z';
const BODY_SHADE = 'M33 20 h8 v32 q0 2 -2 2 h-6 z';
const COLLAR = 'M23 14 q9 8 18 0 l-3 -1 q-6 6 -12 0 z';

/** Sleeve pairs: short, long, and the wider cut an outer layer needs. */
const SLEEVE_SHORT = ['M23 14 l-12 6 4 11 8 -4 z', 'M41 14 l12 6 -4 11 -8 -4 z'];
const SLEEVE_LONG = ['M23 14 l-12 6 7 24 9 -4 z', 'M41 14 l12 6 -7 24 -9 -4 z'];
const SLEEVE_WIDE = ['M22 13 l-13 7 8 26 10 -5 z', 'M42 13 l13 7 -8 26 -10 -5 z'];

/** The right sleeve is drawn in shadow. Without it a top is one silhouette in
 *  one colour, and the sleeves disappear into the body. */
const top = (sleeves: string[], extras: Piece[] = [], body = BODY): Piece[] => [
  P(sleeves[0]), P(sleeves[1], S),
  P(body),
  P(BODY_SHADE, S),
  ...extras,
];

/** Trousers, with the inseam cut so two legs read as two legs. */
const legs = (hem: number, waist = 14): Piece[] => [
  P(`M22 ${waist} h20 l2 ${hem - waist} h-9 l-3 -${Math.round((hem - waist) * 0.62)} -3 ${Math.round((hem - waist) * 0.62)} h-9 z`),
  P(`M33 ${waist + 2} h8 l2 ${hem - waist - 2} h-9 z`, S),
  P(`M22 ${waist} h20 v4 h-20 z`, L),
];

const ART: Record<GarmentId, Piece[]> = {
  // ---------------------------------------------------------------- base
  tank: [
    P('M24 10 h5 v14 h-5 z'),
    P('M35 10 h5 v14 h-5 z', S),
    P('M22 20 q10 7 20 0 v32 q0 2 -2 2 h-16 q-2 0 -2 -2 z'),
    P('M33 25 h9 v27 q0 2 -2 2 h-7 z', S),
    P('M22 20 q10 7 20 0 l-2 -2 q-8 6 -16 0 z', L),
  ],
  tee: top(SLEEVE_SHORT, [P(COLLAR, L)]),
  long_sleeve: top(SLEEVE_LONG, [
    P(COLLAR, L),
    P('M11 38 l9 -4 2 5 -9 4 z', L),
    P('M53 38 l-9 -4 -2 5 9 4 z', L),
  ]),
  thermal_top: top(SLEEVE_LONG, [
    P(COLLAR, L),
    P('M25 42 h14 v2 h-14 z', L),
    P('M25 46 h14 v2 h-14 z', L),
    P('M25 50 h14 v2 h-14 z', L),
  ]),

  // ----------------------------------------------------------------- mid
  overshirt: top(SLEEVE_LONG, [
    P('M23 14 h8 l-5 8 z', L),
    P('M41 14 h-8 l5 8 z', L),
    P('M30 16 h4 v38 h-4 z', L),
    P('M32 26 m-1.6 0 a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0', S),
    P('M32 36 m-1.6 0 a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0', S),
    P('M32 46 m-1.6 0 a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0', S),
  ]),
  sweater: top(SLEEVE_LONG, [
    P('M23 14 q9 9 18 0 l-3 -1 q-6 7 -12 0 z', L),
    P('M25 48 h14 v6 q0 0 -2 0 h-10 q-2 0 -2 0 z', L),
    P('M11 38 l9 -4 2 5 -9 4 z', L),
    P('M53 38 l-9 -4 -2 5 9 4 z', L),
    P('M25 24 h14 v1.6 h-14 z', L, { opacity: 0.5 }),
    P('M25 32 h14 v1.6 h-14 z', L, { opacity: 0.5 }),
  ]),
  fleece: top(SLEEVE_WIDE, [
    P('M22 13 q10 9 20 0 l-2 5 q-8 7 -16 0 z', L),
    P('M30 18 h4 v16 h-4 z', L),
    P('M32 36 m-2.4 0 a2.4 2.4 0 1 0 4.8 0 a2.4 2.4 0 1 0 -4.8 0', L),
    P('M25 44 h5 v2 h-5 z', L, { opacity: 0.55 }),
    P('M34 44 h5 v2 h-5 z', L, { opacity: 0.55 }),
  ]),

  // --------------------------------------------------------------- outer
  windbreaker: top(SLEEVE_WIDE, [
    P('M22 13 q10 9 20 0 l-2 5 q-8 7 -16 0 z', L),
    P('M30 18 h4 v36 h-4 z', L),
    P('M23 36 h18 v2 h-18 z', L, { opacity: 0.55 }),
  ], 'M22 13 q10 9 20 0 v39 q0 2 -2 2 h-16 q-2 0 -2 -2 z'),
  light_jacket: top(SLEEVE_WIDE, [
    P('M22 13 h10 l-7 10 z', L),
    P('M42 13 h-10 l7 10 z', L),
    P('M30 22 h4 v32 h-4 z', L),
    P('M24 40 h7 v3 h-7 z', L),
    P('M33 40 h7 v3 h-7 z', L),
  ], 'M22 13 q10 9 20 0 v39 q0 2 -2 2 h-16 q-2 0 -2 -2 z'),
  rain_shell: [
    P('M22 18 l-13 7 8 26 10 -5 z'), P('M42 18 l13 7 -8 26 -10 -5 z', S),
    P('M22 18 q10 9 20 0 v36 q0 2 -2 2 h-16 q-2 0 -2 -2 z'),
    P('M33 24 h9 v30 q0 2 -2 2 h-7 z', S),
    // the hood is what separates a rain shell from any other jacket
    P('M24 18 q8 -12 16 0 q-8 -6 -16 0 z', L),
    P('M23 10 q9 -6 18 0 l1 8 q-10 -7 -20 0 z'),
    P('M30 22 h4 v32 h-4 z', L),
    P('M23 40 h18 v3 h-18 z', L),
  ],
  coat: [
    P('M22 13 l-13 7 8 26 10 -5 z'), P('M42 13 l13 7 -8 26 -10 -5 z', S),
    P('M22 13 q10 8 20 0 v43 q0 2 -2 2 h-16 q-2 0 -2 -2 z'),
    P('M33 20 h9 v36 q0 2 -2 2 h-7 z', S),
    P('M22 13 h11 l-8 12 z', L),
    P('M42 13 h-11 l8 12 z', L),
    P('M27 30 m-1.8 0 a1.8 1.8 0 1 0 3.6 0 a1.8 1.8 0 1 0 -3.6 0', L),
    P('M27 40 m-1.8 0 a1.8 1.8 0 1 0 3.6 0 a1.8 1.8 0 1 0 -3.6 0', L),
    P('M37 30 m-1.8 0 a1.8 1.8 0 1 0 3.6 0 a1.8 1.8 0 1 0 -3.6 0', L),
    P('M37 40 m-1.8 0 a1.8 1.8 0 1 0 3.6 0 a1.8 1.8 0 1 0 -3.6 0', L),
  ],
  parka: [
    P('M21 17 l-13 8 9 26 10 -5 z'), P('M43 17 l13 8 -9 26 -10 -5 z', S),
    P('M21 17 q11 9 22 0 v39 q0 2 -2 2 h-18 q-2 0 -2 -2 z'),
    P('M33 24 h10 v32 q0 2 -2 2 h-8 z', S),
    P('M22 9 q10 -7 20 0 l1 8 q-11 -8 -22 0 z'),
    P('M22 9 q10 -7 20 0 l0.4 3 q-10 -7 -20.4 0 z', L),
    // quilting
    P('M22 28 h20 v2 h-20 z', L, { opacity: 0.5 }),
    P('M22 38 h20 v2 h-20 z', L, { opacity: 0.5 }),
    P('M22 48 h20 v2 h-20 z', L, { opacity: 0.5 }),
    P('M30 22 h4 v36 h-4 z', L),
  ],

  // ---------------------------------------------------------------- legs
  shorts: legs(34),
  trousers: legs(54),
  lined_trousers: [
    ...legs(54),
    P('M22 46 h9 v3 h-9 z', L),
    P('M35 46 h9 v3 h-9 z', L),
  ],
  thermal_leggings: [
    P('M24 14 h16 l2 40 h-7 l-3 -26 -3 26 h-7 z'),
    P('M33 16 h7 l2 38 h-7 z', S),
    P('M24 14 h16 v3 h-16 z', L),
    P('M25 22 h14 v1.6 h-14 z', L, { opacity: 0.5 }),
    P('M25 28 h14 v1.6 h-14 z', L, { opacity: 0.5 }),
  ],

  // ---------------------------------------------------------------- feet
  sandals: [
    P('M10 40 h38 q4 0 4 4 q0 4 -4 4 h-38 z'),
    P('M10 44 h42 q0 4 -4 4 h-38 z', L),
    P('M16 40 q10 -12 22 -4 l-2 4 q-9 -6 -17 3 z', T),
    P('M20 40 q6 -8 14 -3', 'none', { stroke: L, strokeWidth: 2.4 }),
  ],
  sneakers: [
    P('M10 28 h11 q10 4 21 11 q5 3 5 8 v3 h-37 z'),
    P('M30 34 q7 4 12 8 q5 3 5 8 v3 h-12 z', S),
    P('M8 48 h40 v5 q0 2 -2 2 h-36 q-2 0 -2 -2 z', L),
    P('M18 31 q9 4 16 10', 'none', { stroke: L, strokeWidth: 2.6 }),
    P('M15 36 q9 4 15 10', 'none', { stroke: L, strokeWidth: 2.6, opacity: 0.7 }),
  ],
  waterproof_shoes: [
    P('M10 24 h11 q11 5 22 13 q5 3 5 8 v4 h-38 z'),
    P('M31 31 q7 4 12 8 q5 3 5 8 v4 h-13 z', S),
    P('M8 47 h41 v6 q0 2 -2 2 h-37 q-2 0 -2 -2 z', L),
    P('M14 30 q11 5 19 12', 'none', { stroke: L, strokeWidth: 2.2, opacity: 0.6 }),
  ],
  boots: [
    P('M14 10 h18 v28 q9 5 13 11 q2 3 2 5 h-33 z'),
    P('M26 14 h6 v24 q9 5 13 11 q2 3 2 5 h-21 z', S),
    P('M12 50 h36 v5 q0 2 -2 2 h-32 q-2 0 -2 -2 z', L),
    P('M14 10 h18 v6 h-18 z', L),
    P('M14 30 h18 v3 h-18 z', L, { opacity: 0.6 }),
  ],

  // --------------------------------------------------------- accessories
  cap: [
    // a flatter crown than a hat, and a peak in shadow so it reads as a
    // separate plane rather than as part of one bell-shaped silhouette
    P('M13 38 q1 -22 19 -22 q18 0 19 22 z'),
    P('M32 16 q18 0 19 22 h-12 q0 -18 -7 -22 z', S),
    P('M49 32 q13 2 13 8 q0 2 -3 2 h-10 z', S),
    P('M13 34 h38 v4 h-38 z', L),
    P('M32 14 m-2.4 0 a2.4 2.4 0 1 0 4.8 0 a2.4 2.4 0 1 0 -4.8 0', L),
  ],
  beanie: [
    P('M13 38 q3 -26 19 -26 q16 0 19 26 z'),
    P('M32 12 q16 0 19 26 h-11 q0 -20 -10 -25 z', S),
    P('M9 36 h46 q3 0 3 4 v4 q0 4 -3 4 h-46 q-3 0 -3 -4 v-4 q0 -4 3 -4 z', L),
    P('M32 8 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0'),
  ],
  sunglasses: [
    P('M6 24 h22 q3 0 3 4 v6 q0 7 -8 7 h-8 q-9 0 -9 -9 z'),
    P('M36 24 h22 v8 q0 9 -9 9 h-8 q-8 0 -8 -7 v-6 q0 -4 3 -4 z'),
    P('M28 26 h8 v4 h-8 z'),
    P('M9 27 h10 l-8 7 h-3 z', L),
    P('M39 27 h10 l-8 7 h-3 z', L, { opacity: 0.7 }),
  ],
  scarf: [
    // a loop round the neck, with both ends hanging
    P('M14 12 q18 14 36 0 l4 11 q-22 16 -44 0 z'),
    P('M36 19 q8 -2 14 -7 l4 11 q-8 6 -16 8 z', S),
    P('M22 27 l4 25 h-11 l-2 -22 z'),
    P('M38 27 l8 22 h-11 l-4 -24 z', S),
    P('M14 52 h12 l1 5 h-14 z', L),
    P('M34 49 h12 l2 5 h-14 z', L),
  ],
  gloves: [
    // four fingers, a thumb off to the side, and a cuff at the wrist
    P('M22 10 h20 q6 0 6 7 v22 h-32 v-22 q0 -7 6 -7 z'),
    P('M36 10 h6 q6 0 6 7 v22 h-12 z', S),
    P('M16 24 q-8 4 -5 12 q3 6 11 3 z'),
    P('M27 10 v18', 'none', { stroke: S, strokeWidth: 1.6, opacity: 0.55 }),
    P('M32 10 v18', 'none', { stroke: S, strokeWidth: 1.6, opacity: 0.55 }),
    P('M37 10 v18', 'none', { stroke: S, strokeWidth: 1.6, opacity: 0.55 }),
    P('M14 39 h34 v11 q0 3 -3 3 h-28 q-3 0 -3 -3 z', L),
  ],
  umbrella: [
    P('M32 8 q22 0 26 22 h-52 q4 -22 26 -22 z'),
    P('M32 8 q22 0 26 22 h-13 q-1 -19 -13 -22 z', S),
    P('M6 30 q7 -7 13 0 q6 -7 13 0 q7 -7 13 0 q6 -7 13 0 v2 h-52 z', L),
    P('M30 30 h4 v20 q0 6 -6 6 q-6 0 -6 -6 h4 q0 2 2 2 q2 0 2 -2 z'),
    P('M32 4 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0', L),
  ],
};

export default function GarmentIcon({ id, tone, size = 40, className, label }: Props) {
  const t = fabric[tone];
  const art: ReactNode = (ART[id] ?? []).map((piece, i) => (
    <path
      key={i}
      d={piece.d}
      fill={piece.fill as string}
      stroke={(piece as { stroke?: string }).stroke}
      strokeWidth={(piece as { strokeWidth?: number }).strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={(piece as { opacity?: number }).opacity}
    />
  ));

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      style={{
        // The three fabric values arrive as custom properties so one drawing
        // serves every tone without rebuilding the path list per garment.
        ['--g-base' as string]: t.base,
        ['--g-shade' as string]: t.shade,
        ['--g-light' as string]: t.light,
      }}
    >
      {art}
    </svg>
  );
}
