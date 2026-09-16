import type { Garment, HourWeather } from './types';
// Explicit .ts extension so this module resolves both under Vite and under
// plain Node, which the icon tool in tools/ uses. Type-only imports are
// erased before runtime and so do not need one.
import { isRaining, isSnowing } from './lib/outfitEngine.ts';
import type { Paint } from './components/figureParts.ts';

/**
 * Every fabric carries three values rather than one flat colour. The figure
 * and the garment icons both shade with them — `base` for the cloth, `shade`
 * for the side away from the light, `light` for collars, cuffs, zips and
 * soles. Flat fills read as a pictogram; three values read as a garment.
 */
export interface Tone {
  base: string;
  shade: string;
  light: string;
}

export const fabric: Record<Garment['tone'], Tone> = {
  skin:  { base: '#E3A87C', shade: '#C4855C', light: '#F5C9A6' },
  base:  { base: '#F4F1E8', shade: '#D2CCBC', light: '#FFFFFF' },
  knit:  { base: '#C97B4A', shade: '#A25B31', light: '#E4A277' },
  shell: { base: '#3D85B8', shade: '#2A608A', light: '#68AEDA' },
  denim: { base: '#3D5A8C', shade: '#2A4067', light: '#6280B4' },
  // Slate rather than black: a true charcoal disappears against the dark
  // interface, and every heavy garment — coat, parka, boots — uses this tone.
  dark:  { base: '#4B5468', shade: '#333A4B', light: '#767F98' },
  alert: { base: '#F5B417', shade: '#CC900A', light: '#FFD667' },
};

export const hairColor = '#3B2A20';
export const hairShade = '#2A1D16';

/** Resolves a shape's declared paint against a garment's fabric. Shared by
 *  the app's figure, the garment icons and the PWA icon generator, so a
 *  garment cannot be one colour in the app and another on the home screen. */
export function paintColor(
  paint: Paint | 'none' | undefined,
  tone: Garment['tone'],
): string {
  switch (paint) {
    case 'none': case undefined: return 'none';
    case 'tone': return fabric[tone].base;
    case 'shade': return fabric[tone].shade;
    case 'light': return fabric[tone].light;
    case 'skin': return fabric.skin.base;
    case 'skin-shade': return fabric.skin.shade;
    case 'hair': return hairColor;
    case 'hair-shade': return hairShade;
    case 'ink': return '#2A1F1A';
    case 'seam-light': return '#FFFFFF';
    case 'seam-dark': return '#14181C';
  }
}

/** Weather the scenery can depict. The sky panel and the animated clip-art
 *  both switch on this rather than on raw weather codes. */
export type SkyKind = 'clearDay' | 'clearNight' | 'cloudy' | 'overcast' | 'rain' | 'snow';

export interface SkyTheme {
  kind: SkyKind;
  /** Top and bottom of the panel gradient. */
  from: string;
  to: string;
  /** Text that stays legible on it. */
  ink: string;
  /** The sun, the moon, or the brightest thing in the scene. */
  glow: string;
  /** Accent used for the card's edge glow. */
  accent: string;
  isNight: boolean;
}

export const sky: Record<SkyKind, SkyTheme> = {
  clearDay: {
    kind: 'clearDay', from: '#2E8FE0', to: '#8ED0FB',
    ink: '#06283F', glow: '#FFD36E', accent: '#4FA9F0', isNight: false,
  },
  clearNight: {
    kind: 'clearNight', from: '#10143A', to: '#3A2F68',
    ink: '#E9ECFF', glow: '#CBD6FF', accent: '#7C6BFF', isNight: true,
  },
  cloudy: {
    kind: 'cloudy', from: '#5E7FA6', to: '#AFC3D6',
    ink: '#0C1D2C', glow: '#F1F6FB', accent: '#7FA3C6', isNight: false,
  },
  overcast: {
    kind: 'overcast', from: '#4E5D6E', to: '#93A2B1',
    ink: '#0A151F', glow: '#DCE4EC', accent: '#7C8B9C', isNight: false,
  },
  rain: {
    kind: 'rain', from: '#27465E', to: '#6C8CA6',
    ink: '#EAF4FB', glow: '#BEDCF0', accent: '#4E9BC9', isNight: false,
  },
  snow: {
    kind: 'snow', from: '#6F8FAC', to: '#DCEAF5',
    ink: '#0D2233', glow: '#FFFFFF', accent: '#8FBEDD', isNight: false,
  },
};

export function skyFor(h: HourWeather | undefined): SkyTheme {
  if (!h) return sky.cloudy;
  if (isSnowing(h)) return sky.snow;
  if (isRaining(h)) return sky.rain;
  if (!h.isDay) return sky.clearNight;
  if (h.cloudCover >= 80) return sky.overcast;
  if (h.cloudCover >= 40) return sky.cloudy;
  return sky.clearDay;
}
