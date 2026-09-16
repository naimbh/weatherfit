import type {
  Garment, GarmentId, HourOutfit, HourWeather, Outfit, OutfitChange, Slot, TempBand, Units,
} from '../types';
// Explicit .ts extension so this resolves under plain Node as well as Vite:
// the tests and the render harness both run this file without a bundler.
import { tempWithUnit, windSpeed } from './format.ts';

const G = (id: GarmentId, slot: Slot, label: string, tone: Garment['tone']): Garment =>
  ({ id, slot, label, tone });

const CATALOG: Record<GarmentId, Garment> = {
  thermal_top:      G('thermal_top', 'base', 'thermal top', 'base'),
  tank:             G('tank', 'base', 'tank top', 'base'),
  tee:              G('tee', 'base', 't-shirt', 'base'),
  long_sleeve:      G('long_sleeve', 'base', 'long sleeve', 'base'),
  overshirt:        G('overshirt', 'mid', 'overshirt', 'denim'),
  sweater:          G('sweater', 'mid', 'sweater', 'knit'),
  fleece:           G('fleece', 'mid', 'fleece', 'knit'),
  windbreaker:      G('windbreaker', 'outer', 'windbreaker', 'shell'),
  rain_shell:       G('rain_shell', 'outer', 'rain shell', 'alert'),
  light_jacket:     G('light_jacket', 'outer', 'light jacket', 'shell'),
  coat:             G('coat', 'outer', 'coat', 'dark'),
  parka:            G('parka', 'outer', 'insulated parka', 'dark'),
  shorts:           G('shorts', 'legs', 'shorts', 'denim'),
  trousers:         G('trousers', 'legs', 'trousers', 'denim'),
  thermal_leggings: G('thermal_leggings', 'legs', 'thermal leggings', 'dark'),
  lined_trousers:   G('lined_trousers', 'legs', 'lined trousers', 'dark'),
  sandals:          G('sandals', 'feet', 'sandals', 'knit'),
  sneakers:         G('sneakers', 'feet', 'sneakers', 'dark'),
  waterproof_shoes: G('waterproof_shoes', 'feet', 'waterproof shoes', 'dark'),
  boots:            G('boots', 'feet', 'insulated boots', 'dark'),
  cap:              G('cap', 'accessory', 'cap', 'base'),
  beanie:           G('beanie', 'accessory', 'beanie', 'knit'),
  sunglasses:       G('sunglasses', 'accessory', 'sunglasses', 'dark'),
  scarf:            G('scarf', 'accessory', 'scarf', 'knit'),
  gloves:           G('gloves', 'accessory', 'gloves', 'knit'),
  umbrella:         G('umbrella', 'accessory', 'umbrella', 'dark'),
};

/** Draw order: later entries render on top of earlier ones. */
export const DRAW_ORDER: GarmentId[] = [
  'thermal_leggings', 'lined_trousers', 'trousers', 'shorts',
  'sandals', 'sneakers', 'waterproof_shoes', 'boots',
  'thermal_top', 'tank', 'tee', 'long_sleeve',
  'overshirt', 'sweater', 'fleece',
  'windbreaker', 'light_jacket', 'rain_shell', 'coat', 'parka',
  'scarf', 'beanie', 'cap', 'sunglasses', 'gloves', 'umbrella',
];

interface Band {
  band: TempBand;
  maxFeels: number;   // upper bound, exclusive
  base: GarmentId;
  mid?: GarmentId;
  outer?: GarmentId;
  legs: GarmentId;
  feet: GarmentId;
  accessories: GarmentId[];
  phrase: string;
}

/** Bands are evaluated low-to-high on feels-like temperature in Celsius. */
const BANDS: Band[] = [
  { band: 'extreme',  maxFeels: -10, base: 'thermal_top', mid: 'fleece', outer: 'parka',
    legs: 'thermal_leggings', feet: 'boots', accessories: ['beanie', 'gloves', 'scarf'],
    phrase: 'Everything you own, layered' },
  { band: 'freezing', maxFeels: -1, base: 'thermal_top', mid: 'sweater', outer: 'parka',
    legs: 'lined_trousers', feet: 'boots', accessories: ['beanie', 'gloves', 'scarf'],
    phrase: 'Thermals under a sweater and parka' },
  { band: 'cold',     maxFeels: 6, base: 'long_sleeve', mid: 'sweater', outer: 'coat',
    legs: 'lined_trousers', feet: 'boots', accessories: ['beanie'],
    phrase: 'Sweater and a proper coat' },
  { band: 'chilly',   maxFeels: 11, base: 'long_sleeve', mid: 'sweater', outer: 'light_jacket',
    legs: 'trousers', feet: 'sneakers', accessories: [],
    phrase: 'Sweater under a jacket' },
  { band: 'cool',     maxFeels: 16, base: 'long_sleeve', outer: 'light_jacket',
    legs: 'trousers', feet: 'sneakers', accessories: [],
    phrase: 'Long sleeve under a light jacket' },
  { band: 'mild',     maxFeels: 20, base: 'long_sleeve', mid: 'overshirt',
    legs: 'trousers', feet: 'sneakers', accessories: [],
    phrase: 'Long sleeve, overshirt if the breeze picks up' },
  { band: 'warm',     maxFeels: 25, base: 'tee', legs: 'trousers', feet: 'sneakers',
    accessories: [], phrase: 'T-shirt and trousers' },
  { band: 'hot',      maxFeels: 30, base: 'tee', legs: 'shorts', feet: 'sneakers',
    accessories: [], phrase: 'T-shirt and shorts' },
  { band: 'blazing',  maxFeels: Infinity, base: 'tank', legs: 'shorts', feet: 'sandals',
    accessories: ['cap'], phrase: 'Lightest thing you have' },
];

const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);

export function isRaining(h: HourWeather): boolean {
  return RAIN_CODES.has(h.code) || h.precipMm >= 0.2 || h.precipProb >= 45;
}

export function isSnowing(h: HourWeather): boolean {
  return SNOW_CODES.has(h.code) || h.snowfallCm > 0;
}

function bandFor(feelsLikeC: number): Band {
  return BANDS.find((b) => feelsLikeC < b.maxFeels) ?? BANDS[BANDS.length - 1];
}

/** Turn one hour of weather into a full outfit. `units` only affects the
 *  wording of the reasons — the garment choices are made in Celsius. */
export function buildOutfit(h: HourWeather, units: Units = 'metric'): Outfit {
  const band = bandFor(h.feelsLikeC);
  const picked = new Map<Slot, Garment[]>();
  const reasons: string[] = [];

  const put = (id: GarmentId) => {
    const g = CATALOG[id];
    const list = picked.get(g.slot) ?? [];
    if (!list.some((x) => x.id === g.id)) list.push(g);
    picked.set(g.slot, list);
  };
  const replace = (slot: Slot, id: GarmentId) => {
    picked.set(slot, [CATALOG[id]]);
  };

  put(band.base);
  if (band.mid) put(band.mid);
  if (band.outer) put(band.outer);
  put(band.legs);
  put(band.feet);
  band.accessories.forEach(put);
  reasons.push(`Feels like ${tempWithUnit(h.feelsLikeC, units)}`);

  const raining = isRaining(h);
  const snowing = isSnowing(h);
  const windy = h.windKph >= 28 || h.gustKph >= 40;

  if (snowing) {
    replace('outer', h.feelsLikeC < -1 ? 'parka' : 'coat');
    replace('feet', 'boots');
    put('beanie');
    put('gloves');
    reasons.push('Snow falling');
  } else if (raining) {
    // A rain shell goes over whatever mid layer the temperature called for.
    replace('outer', 'rain_shell');
    if (band.band === 'warm' || band.band === 'mild' || band.band === 'cool') {
      replace('legs', 'trousers');
    }
    if (picked.get('feet')?.[0]?.id !== 'boots') replace('feet', 'waterproof_shoes');
    put('umbrella');
    reasons.push(
      h.precipProb >= 45 && h.precipMm < 0.2
        ? `${Math.round(h.precipProb)}% chance of rain`
        : 'Rain expected',
    );
  } else if (windy && !band.outer) {
    put('windbreaker');
    reasons.push(`Wind ${windSpeed(h.windKph, units)}`);
  } else if (windy) {
    reasons.push(`Wind ${windSpeed(h.windKph, units)}`);
  }

  if (h.isDay && h.uvIndex >= 6 && !raining && !snowing) {
    put('sunglasses');
    if (h.feelsLikeC >= 20) put('cap');
    reasons.push(`UV index ${Math.round(h.uvIndex)}`);
  }

  if (h.feelsLikeC >= 26 && h.humidity >= 70) {
    reasons.push('Humid — go breathable');
  }

  const garments = DRAW_ORDER
    .map((id) => {
      for (const list of picked.values()) {
        const hit = list.find((g) => g.id === id);
        if (hit) return hit;
      }
      return null;
    })
    .filter((g): g is Garment => g !== null);

  return {
    garments,
    signature: garments.map((g) => g.id).join('|'),
    note: noteFor(garments, band, { raining, snowing, windy }),
    reasons,
    band: band.band,
  };
}

function noteFor(
  garments: Garment[],
  band: Band,
  ctx: { raining: boolean; snowing: boolean; windy: boolean },
): string {
  const has = (id: GarmentId) => garments.some((g) => g.id === id);
  let note = band.phrase + '.';
  if (ctx.snowing) note = `${band.phrase}, with boots — it's snowing.`;
  else if (ctx.raining && has('umbrella')) note = `${band.phrase}, plus a rain shell. Take the umbrella.`;
  else if (ctx.windy && has('windbreaker')) note = `${band.phrase}, with a windbreaker over the top.`;
  if (has('sunglasses') && !ctx.raining && !ctx.snowing) note += ' Sun is strong — bring sunglasses.';
  return note;
}

/** Map an hourly forecast to an outfit per hour. */
export function buildHourlyOutfits(
  hours: HourWeather[],
  units: Units = 'metric',
): HourOutfit[] {
  return hours.map((hour) => ({ hour, outfit: buildOutfit(hour, units) }));
}

/**
 * Find the points where the outfit meaningfully changes.
 * Accessory-only flips (sunglasses on, sunglasses off) are ignored unless
 * they involve rain gear, which people actually need warning about.
 */
const MUST_ANNOUNCE = new Set<GarmentId>([
  'rain_shell', 'umbrella', 'boots', 'waterproof_shoes', 'parka', 'coat',
  'light_jacket', 'windbreaker', 'sweater', 'fleece', 'beanie', 'gloves', 'shorts',
  'lined_trousers', 'thermal_leggings', 'thermal_top',
]);

export function detectChanges(list: HourOutfit[]): OutfitChange[] {
  const changes: OutfitChange[] = [];

  for (let i = 1; i < list.length; i++) {
    const prev = list[i - 1].outfit;
    const next = list[i].outfit;
    if (prev.signature === next.signature) continue;

    const prevIds = new Set(prev.garments.map((g) => g.id));
    const nextIds = new Set(next.garments.map((g) => g.id));
    const added = next.garments.filter((g) => !prevIds.has(g.id));
    const removed = prev.garments.filter((g) => !nextIds.has(g.id));

    const worthTelling = [...added, ...removed].some((g) => MUST_ANNOUNCE.has(g.id));
    if (!worthTelling) continue;

    changes.push({
      index: i,
      time: list[i].hour.time,
      instruction: instructionFor(added, removed),
      added,
      removed,
    });
  }
  return changes;
}

/** Most consequential slot first, so a capped instruction keeps what matters. */
const SLOT_WEIGHT: Record<Slot, number> = {
  outer: 0, feet: 1, mid: 2, accessory: 3, legs: 4, base: 5,
};

function instructionFor(added: Garment[], removed: Garment[]): string {
  const rank = (gs: Garment[]) =>
    gs.filter((g) => MUST_ANNOUNCE.has(g.id))
      .sort((x, y) => SLOT_WEIGHT[x.slot] - SLOT_WEIGHT[y.slot])
      .slice(0, 3);
  const a = rank(added);
  const r = rank(removed);
  const list = (gs: Garment[]) =>
    gs.map((g) => g.label).reduce((acc, cur, i, arr) =>
      i === 0 ? cur : i === arr.length - 1 ? `${acc} and ${cur}` : `${acc}, ${cur}`, '');

  if (a.length && r.length) return `swap the ${list(r)} for the ${list(a)}`;
  if (a.length) return `add the ${list(a)}`;
  if (r.length) return `lose the ${list(r)}`;
  return 'outfit shifts';
}

/** The next upcoming change relative to now, if any. */
export function nextChange(list: HourOutfit[], changes: OutfitChange[], now = new Date()) {
  return changes.find((c) => new Date(list[c.index].hour.time) > now) ?? null;
}

/**
 * Short summary of what is being worn, outermost first — "light jacket +
 * long sleeve". Used by the compact widget view, where there is only room for
 * a couple of items. Picking by slot matters: the garments array is in draw
 * order, so a plain find() would return the base layer.
 */
export function outfitSummary(garments: Garment[], limit = 2): string {
  const order: Slot[] = ['outer', 'mid', 'base'];
  const picked = order
    .map((slot) => garments.find((g) => g.slot === slot))
    .filter((g): g is Garment => g !== undefined);
  return picked.slice(0, limit).map((g) => g.label).join(' + ');
}

export const cToF = (c: number) => (c * 9) / 5 + 32;
export const formatTemp = (c: number, units: 'metric' | 'imperial') =>
  `${Math.round(units === 'metric' ? c : cToF(c))}°`;
