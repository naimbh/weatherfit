import type { GarmentId } from '../types';

/**
 * Figure geometry lives here as plain data rather than JSX so the same
 * definitions can be drawn by the app, by the garment-icon sheet and by the
 * PWA icon generator in tools/. One source of truth is the only way to catch
 * a broken path before it ships.
 *
 * Coordinate reference (viewBox 160 x 240), centre line x = 80:
 *   head      circle cy 32, r 15      -> y 17..47
 *   neck      y 42..58
 *   shoulders y 58, spanning x 50..110
 *   waist     y 126, spanning x 58..102
 *   wrists    y 130, hands at cy 134
 *   ankles    y 196, shoes to y 207
 *
 * Every garment is drawn in three passes: the cloth in `tone`, a band down
 * the right-hand side in `shade` because the light comes from the left, and
 * collars, cuffs, zips and soles in `light`. A single flat fill reads as a
 * pictogram; the three passes read as a garment.
 *
 * Only M/L/H/V/Q/Z path commands (and their relative forms) are used. The
 * bounds test in outfitEngine.test.ts walks exactly that subset to verify
 * nothing is drawn off-canvas, and a cubic would silently defeat it.
 */

export const VIEWBOX = { width: 160, height: 240 } as const;

/**
 * The drawn figure only occupies a narrow column of the coordinate space
 * above, so rendering the full 160x240 box would leave ~45% of the width
 * empty and shrink the figure. This is the crop actually shown. The internal
 * coordinate system stays at 160 wide because the mirror transform reflects
 * about VIEWBOX.width / 2.
 */
export const VIEW_WINDOW = { x: 33, y: 2, width: 94, height: 206 } as const;

/** Measured extent of everything the figure can draw, in the coordinate space
 *  above, including mirrored shapes. Verified by a test in outfitEngine.test.ts. */
export const CONTENT_BOUNDS = { minX: 35, maxX: 125, minY: 4, maxY: 206 } as const;

export const viewBoxAttr = () =>
  `${VIEW_WINDOW.x} ${VIEW_WINDOW.y} ${VIEW_WINDOW.width} ${VIEW_WINDOW.height}`;

export type Paint =
  | 'tone' | 'shade' | 'light'
  | 'skin' | 'skin-shade'
  | 'hair' | 'hair-shade'
  | 'ink'
  | 'seam-light' | 'seam-dark';

export interface Shape {
  kind: 'circle' | 'rect' | 'path';
  cx?: number; cy?: number; r?: number;
  x?: number; y?: number; w?: number; h?: number; rx?: number;
  d?: string;
  fill?: Paint | 'none';
  stroke?: Paint;
  strokeWidth?: number;
  opacity?: number;
  /**
   * Draw this shape twice: as given, and reflected about the centre line.
   * Left-side geometry is defined once so the two sides cannot drift apart.
   */
  mirror?: boolean;
}

/** Marks a shape pair as left-side-defined, mirrored at render time. */
export const pair = (s: Shape): Shape => ({ ...s, mirror: true });

const p = (d: string, fill: Paint | 'none' = 'tone'): Shape =>
  ({ kind: 'path', d, fill });

/** The side away from the light. */
const sh = (d: string): Shape => p(d, 'shade');

/** Collars, cuffs, zips, soles — the parts that catch the light. */
const hi = (d: string): Shape => p(d, 'light');

const r = (x: number, y: number, w: number, h: number, rx = 0, fill: Paint = 'tone'): Shape =>
  ({ kind: 'rect', x, y, w, h, rx, fill });

const c = (cx: number, cy: number, radius: number, fill: Paint = 'tone'): Shape =>
  ({ kind: 'circle', cx, cy, r: radius, fill });

const seam = (d: string, paint: Paint, strokeWidth: number, opacity = 1): Shape =>
  ({ kind: 'path', d, fill: 'none', stroke: paint, strokeWidth, opacity });

// ---------------------------------------------------------------- pieces

/** Shadow band down the right of a torso, from the shoulder to the hem. */
const TORSO_SHADE = (hemY: number, width = 11) =>
  sh(`M110 58 l-5 18 -3 ${hemY - 76} h-${width} l3 -${hemY - 76} l4 -18 z`);

/** Crew neckline, drawn as a thin crescent so the collar catches the light. */
const CREW = hi('M69 58 q11 11 22 0 l-3 0 q-8 8 -16 0 z');

/** Cuff at the wrist of a long sleeve. */
const CUFF = pair(hi('M43.5 123 h12.5 l-0.8 7 h-12.5 z'));

/** Armhole crease, defined left-side only and mirrored. */
const ARMHOLES = (opacity: number): Shape[] => [
  pair(seam('M62 62 q-5 13 -4 28', 'seam-dark', 1.2, opacity)),
];

/** The bare body, drawn before any garment. Arms angle outward so that
 *  hands — and therefore gloves — clear even the widest coat hem. */
export const BODY: Shape[] = [
  // legs and feet first, so the torso overlaps them at the hip
  p('M58 126 h44 l-2 72 h-16 l-4 -56 -4 56 h-16 z', 'skin'),
  pair(p('M48 60 h13 l-7 68 h-13 z', 'skin')),
  pair(c(47, 134, 7, 'skin')),
  p('M50 58 h60 l-5 18 -3 50 h-44 l-3 -50 z', 'skin'),
  // neck, then the shadow the chin casts on it
  r(74, 42, 12, 16, 0, 'skin'),
  p('M74 42 h12 v5 q-6 5 -12 0 z', 'skin-shade'),
  pair(c(65.5, 34, 3.5, 'skin')),
  c(80, 32, 15, 'skin'),
  // face
  c(75, 33, 1.9, 'ink'),
  c(85, 33, 1.9, 'ink'),
  seam('M76 40 q4 3.5 8 0', 'ink', 1.4, 0.55),
];

/** Skipped when a hat is worn. */
export const HAIR: Shape[] = [
  p('M64 36 q0 -21 16 -21 q16 0 16 21 q-4 -9 -16 -9 q-12 0 -16 9 z', 'hair'),
  p('M88 20 q8 5 8 16 q-4 -9 -16 -9 q6 -6 8 -7 z', 'hair-shade'),
];

export const GARMENT_SHAPES: Record<GarmentId, Shape[]> = {
  // ---------------- legs ----------------
  shorts: [
    p('M58 126 h44 l-2 34 h-17 l-3 -18 -3 18 h-17 z'),
    sh('M92 126 h10 l-2 34 h-10 z'),
    hi('M58 126 h44 l-0.5 6 h-43 z'),
  ],
  trousers: [
    p('M58 126 h44 l-2 70 h-17 l-3 -54 -3 54 h-17 z'),
    sh('M92 126 h10 l-2 70 h-10 z'),
    hi('M58 126 h44 l-0.5 5 h-43 z'),
    seam('M69 140 v52', 'seam-light', 1, 0.18),
  ],
  lined_trousers: [
    p('M56 126 h48 l-2 72 h-18 l-4 -56 -4 56 h-18 z'),
    sh('M93 126 h11 l-2 72 h-11 z'),
    hi('M56 126 h48 l-0.5 6 h-47 z'),
    hi('M58 190 h17 l-0.3 6 h-17 z'),
  ],
  thermal_leggings: [
    p('M59 126 h42 l-2 70 h-16 l-3 -54 -3 54 h-16 z'),
    sh('M92 126 h9 l-2 70 h-9 z'),
    seam('M62 136 h37', 'seam-light', 1, 0.2),
    seam('M63 150 h35', 'seam-light', 1, 0.2),
  ],

  // ---------------- feet ----------------
  sandals: [
    pair(p('M50 199 h27 q3 0 3 3 q0 3 -3 3 h-27 z')),
    pair(hi('M50 203 h30 q0 3 -3 3 h-27 z')),
    pair(seam('M56 199 q8 -6 16 -2', 'seam-light', 2.4, 0.9)),
  ],
  sneakers: [
    pair(p('M50 190 h11 q9 3 17 10 q2 2 2 5 h-30 z')),
    pair(hi('M48 201 h32 v3 q0 2 -2 2 h-28 q-2 0 -2 -2 z')),
    pair(seam('M58 193 q7 3 12 8', 'seam-light', 1.8, 0.8)),
  ],
  waterproof_shoes: [
    pair(p('M49 188 h12 q10 4 18 11 q2 2 2 5 h-32 z')),
    pair(hi('M47 200 h33 v4 q0 2 -2 2 h-29 q-2 0 -2 -2 z')),
    pair(seam('M56 191 q9 4 15 10', 'seam-light', 2, 0.5)),
  ],
  boots: [
    pair(p('M52 172 h20 v18 q6 4 8 9 v2 h-28 z')),
    pair(hi('M50 199 h30 v4 q0 3 -3 3 h-24 q-3 0 -3 -3 z')),
    pair(hi('M52 172 h20 v6 h-20 z')),
    pair(sh('M66 178 h6 v12 q5 4 6 8 h-12 z')),
  ],

  // ---------------- base layer ----------------
  tank: [
    p('M64 58 h32 l-4 18 -2 52 h-20 l-2 -52 z'),
    sh('M88 58 h8 l-4 18 -2 52 h-8 l2 -52 z'),
    hi('M70 58 q10 9 20 0 l-3 0 q-7 6 -14 0 z'),
  ],
  tee: [
    p('M50 58 h60 l-5 18 -3 52 h-44 l-3 -52 z'),
    pair(p('M50 58 h14 l-4 30 h-13 z')),
    TORSO_SHADE(128),
    pair(hi('M47 84 h13 l-0.5 4 h-13 z')),
    CREW,
    ...ARMHOLES(0.12),
  ],
  long_sleeve: [
    p('M50 58 h60 l-5 18 -3 52 h-44 l-3 -52 z'),
    pair(p('M50 58 h14 l-8 72 h-13 z')),
    TORSO_SHADE(128),
    CUFF,
    CREW,
    ...ARMHOLES(0.12),
  ],
  thermal_top: [
    p('M51 58 h58 l-5 18 -3 52 h-42 l-3 -52 z'),
    pair(p('M51 58 h13 l-8 72 h-12 z')),
    TORSO_SHADE(128, 10),
    CUFF,
    CREW,
    seam('M58 120 h44', 'seam-light', 1.2, 0.25),
    seam('M58 112 h44', 'seam-light', 1.2, 0.25),
    ...ARMHOLES(0.12),
  ],

  // ---------------- mid layer ----------------
  overshirt: [
    p('M48 57 h64 l-5 19 -3 53 h-48 l-3 -53 z'),
    pair(p('M48 57 h16 l-9 74 h-14 z')),
    TORSO_SHADE(129, 12),
    CUFF,
    // button placket, with three buttons down it
    hi('M76 60 h8 l-1 69 h-6 z'),
    c(80, 78, 1.8, 'shade'),
    c(80, 96, 1.8, 'shade'),
    c(80, 114, 1.8, 'shade'),
    // collar points
    hi('M68 57 h12 l-9 11 z'),
    hi('M92 57 h-12 l9 11 z'),
    ...ARMHOLES(0.16),
  ],
  sweater: [
    p('M48 57 h64 l-5 19 -3 53 h-48 l-3 -53 z'),
    pair(p('M48 57 h16 l-9 74 h-14 z')),
    TORSO_SHADE(129, 12),
    // ribbed hem and cuffs are what make a sweater read as knitwear
    hi('M56 122 h48 l-0.5 7 h-48 z'),
    pair(hi('M42 123 h13 l-0.8 8 h-13 z')),
    hi('M68 57 q12 12 24 0 l-3 0 q-9 8 -18 0 z'),
    seam('M60 70 h40', 'seam-light', 1.1, 0.16),
    seam('M59 88 h42', 'seam-light', 1.1, 0.16),
    seam('M58 106 h44', 'seam-light', 1.1, 0.16),
    ...ARMHOLES(0.18),
  ],
  fleece: [
    p('M47 56 h66 l-6 20 -3 54 h-48 l-3 -54 z'),
    pair(p('M47 56 h17 l-10 75 h-15 z')),
    TORSO_SHADE(130, 13),
    CUFF,
    // half-zip
    hi('M77 58 h6 v30 h-6 z'),
    seam('M80 58 v30', 'seam-dark', 1.4, 0.45),
    c(80, 88, 2.4, 'light'),
    hi('M66 56 q14 9 28 0 l-2 6 q-12 8 -24 0 z'),
    ...ARMHOLES(0.18),
  ],

  // ---------------- outer layer ----------------
  windbreaker: [
    p('M46 56 h68 l-6 20 -4 56 h-48 l-4 -56 z'),
    pair(p('M46 56 h18 l-10 76 h-15 z')),
    TORSO_SHADE(132, 13),
    CUFF,
    hi('M77 58 h6 l-1 74 h-4 z'),
    seam('M80 58 v74', 'seam-dark', 1.3, 0.4),
    hi('M64 56 q16 10 32 0 l-2 6 q-14 9 -28 0 z'),
    seam('M56 100 h48', 'seam-light', 1.2, 0.3),
    ...ARMHOLES(0.14),
  ],
  light_jacket: [
    p('M46 56 h68 l-6 20 -4 56 h-48 l-4 -56 z'),
    pair(p('M46 56 h18 l-10 76 h-15 z')),
    TORSO_SHADE(132, 13),
    CUFF,
    // open collar, laid back over the shoulders
    hi('M64 56 h16 l-11 16 z'),
    hi('M96 56 h-16 l11 16 z'),
    hi('M77 70 h6 l-1 62 h-4 z'),
    seam('M80 70 v62', 'seam-dark', 1.3, 0.4),
    // flap pockets
    hi('M58 104 h14 l-0.5 4 h-14 z'),
    hi('M88 104 h14 l-0.5 4 h-14 z'),
    ...ARMHOLES(0.14),
  ],
  rain_shell: [
    p('M45 55 h70 l-6 21 -6 60 h-46 l-6 -60 z'),
    pair(p('M45 55 h19 l-11 78 h-16 z')),
    sh('M115 55 l-6 21 -6 60 h-13 l6 -60 l4 -21 z'),
    CUFF,
    // hood pushed back behind the neck
    p('M60 50 q20 -14 40 0 l3 10 q-23 -11 -46 0 z'),
    sh('M92 46 q6 2 8 4 l3 10 q-6 -3 -12 -5 z'),
    hi('M77 60 h6 l-1 76 h-4 z'),
    seam('M80 60 v76', 'seam-dark', 1.4, 0.4),
    // reflective band, the detail that says wet-weather gear
    hi('M54 108 h52 l-0.5 5 h-52 z'),
    ...ARMHOLES(0.14),
  ],
  coat: [
    p('M46 56 h68 l-6 20 -6 84 h-44 l-6 -84 z'),
    pair(p('M46 56 h18 l-10 76 h-15 z')),
    sh('M114 56 l-6 20 -6 84 h-12 l6 -84 l4 -20 z'),
    CUFF,
    // notched lapels
    hi('M62 56 h18 l-13 20 z'),
    hi('M98 56 h-18 l13 20 z'),
    seam('M80 76 v84', 'seam-light', 1.2, 0.18),
    c(74, 92, 2.2, 'light'),
    c(74, 110, 2.2, 'light'),
    c(86, 92, 2.2, 'light'),
    c(86, 110, 2.2, 'light'),
    hi('M56 120 h16 l-0.5 4 h-16 z'),
    hi('M88 120 h16 l-0.5 4 h-16 z'),
    ...ARMHOLES(0.12),
  ],
  parka: [
    p('M44 55 h72 l-7 21 -6 88 h-46 l-6 -88 z'),
    pair(p('M44 55 h20 l-12 80 h-17 z')),
    sh('M116 55 l-7 21 -6 88 h-13 l6 -88 l5 -21 z'),
    CUFF,
    // quilting: the horizontal seams are what make it read as insulated
    seam('M52 76 h56', 'seam-light', 1.3, 0.22),
    seam('M51 96 h58', 'seam-light', 1.3, 0.22),
    seam('M51 116 h58', 'seam-light', 1.3, 0.22),
    seam('M52 136 h56', 'seam-light', 1.3, 0.22),
    hi('M77 58 h6 l-1 106 h-4 z'),
    seam('M80 58 v106', 'seam-dark', 1.4, 0.4),
    // hood worn down across the shoulders, never over the face
    p('M57 50 q23 -16 46 0 l4 12 q-27 -13 -54 0 z'),
    hi('M57 50 q23 -16 46 0 l1 4 q-24 -12 -48 0 z'),
    ...ARMHOLES(0.12),
  ],

  // ---------------- accessories ----------------
  scarf: [
    p('M63 46 q17 12 34 0 l3 12 q-20 13 -40 0 z'),
    sh('M92 52 q3 -1 5 -2 l3 12 q-4 2 -6 3 z'),
    p('M90 58 l8 30 h-12 l-4 -27 z'),
    hi('M86 86 h12 l1 4 h-14 z'),
  ],
  beanie: [
    p('M62 28 q18 -24 36 0 z'),
    sh('M86 15 q8 4 12 13 h-10 z'),
    hi('M59 24 h42 q2 0 2 3 v4 q0 3 -2 3 h-42 q-2 0 -2 -3 v-4 q0 -3 2 -3 z'),
    c(80, 9, 5),
  ],
  cap: [
    p('M63 28 q17 -22 34 0 z'),
    sh('M86 16 q9 4 11 12 h-9 z'),
    // the peak, which is the whole difference between a cap and a bonnet
    sh('M95 24 h14 q4 4 0 7 h-14 z'),
    hi('M63 26 h34 v3 h-34 z'),
    c(80, 14, 2.4, 'light'),
  ],
  sunglasses: [
    pair(r(64, 29, 15, 10, 5)),
    pair(hi('M66 31 h5 l-4 4 h-3 z')),
    seam('M79 33 h2', 'tone', 2.4),
    pair(seam('M64 31 h-6', 'tone', 2)),
  ],
  gloves: [
    pair(p('M40 128 h13 q5 0 5 6 v6 q0 6 -6 6 h-7 q-5 0 -5 -6 z')),
    pair(hi('M40 128 h13 q3 0 4 3 h-17 z')),
    pair(seam('M46 136 v9', 'seam-dark', 1.2, 0.3)),
  ],
  // Carried furled, in the right hand. An open canopy would hide the figure.
  umbrella: [
    p('M107 110 h11 q2 0 2 3 l-3 42 h-9 l-3 -42 q0 -3 2 -3 z'),
    sh('M114 110 h4 q2 0 2 3 l-3 42 h-4 z'),
    p('M108 155 h9 l-4.5 12 z'),
    hi('M106 122 h13 l-0.4 5 h-13 z'),
    seam('M112.5 110 v-11 q0 -8 -8 -8', 'seam-dark', 2.6),
  ],
};

/** Ids that cover the head, so the hair beneath should be skipped. */
export const HEAD_COVERING: GarmentId[] = ['beanie', 'cap'];
