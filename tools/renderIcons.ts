/**
 * Generates the PWA icons from the same figure the app draws, so the icon
 * cannot drift from the artwork. Writes SVGs; tools/makeIcons.sh rasterises
 * them. Maskable icons need their content inside the safe zone (the middle
 * 80%), so the figure is inset rather than filling the square.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { buildOutfit } from '../src/lib/outfitEngine.ts';
import { paintColor } from '../src/theme.ts';
import {
  BODY, CONTENT_BOUNDS, GARMENT_SHAPES, HAIR, HEAD_COVERING, VIEWBOX,
  type Paint, type Shape,
} from '../src/components/figureParts.ts';
import type { Garment, HourWeather } from '../src/types.ts';

const color = paintColor;

const one = (s: Shape, tone: Garment['tone']): string => {
  const a = [
    `fill="${color(s.fill, tone)}"`,
    s.stroke ? `stroke="${color(s.stroke, tone)}"` : '',
    s.strokeWidth ? `stroke-width="${s.strokeWidth}"` : '',
    s.opacity !== undefined ? `opacity="${s.opacity}"` : '',
  ].filter(Boolean).join(' ');
  if (s.kind === 'circle') return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" ${a}/>`;
  if (s.kind === 'rect') return `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${s.rx ?? 0}" ${a}/>`;
  return `<path d="${s.d}" ${a}/>`;
};

const shapes = (list: Shape[], tone: Garment['tone']) => {
  const drawn = list.map((s) => one(s, tone)).join('');
  const m = list.filter((s) => s.mirror).map((s) => one(s, tone)).join('');
  return m ? `${drawn}<g transform="translate(${VIEWBOX.width},0) scale(-1,1)">${m}</g>` : drawn;
};

const weather: HourWeather = {
  time: '2026-09-15T12:00', tempC: 13, feelsLikeC: 12, precipProb: 10,
  precipMm: 0, snowfallCm: 0, windKph: 10, gustKph: 14, uvIndex: 3,
  humidity: 60, cloudCover: 35, isDay: true, code: 1,
};

const outfit = buildOutfit(weather);
const hat = outfit.garments.some((g) => HEAD_COVERING.includes(g.id));

const art = [
  shapes(BODY, 'skin'),
  hat ? '' : shapes(HAIR, 'skin'),
  ...outfit.garments.map((g) => shapes(GARMENT_SHAPES[g.id] ?? [], g.tone)),
].join('');

// Maskable icons get cropped to a circle on some launchers, so the artwork
// must sit inside the middle ~74%. Centre on the figure's measured bounds
// rather than the viewBox, which has empty margins that would push it low.
const SAFE = 0.74;
const contentH = CONTENT_BOUNDS.maxY - CONTENT_BOUNDS.minY;
const scale = (SAFE * 512) / contentH;
const centreX = (CONTENT_BOUNDS.minX + CONTENT_BOUNDS.maxX) / 2;
const centreY = (CONTENT_BOUNDS.minY + CONTENT_BOUNDS.maxY) / 2;
const dx = 256 - centreX * scale;
const dy = 256 - centreY * scale;

const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#CFE4F5"/>
  <rect y="330" width="512" height="182" fill="#EAF2F8"/>
  <g transform="translate(${dx.toFixed(2)}, ${dy.toFixed(2)}) scale(${scale.toFixed(4)})">${art}</g>
</svg>`;

mkdirSync('tools/out', { recursive: true });
writeFileSync('tools/out/icon.svg', icon);
console.log('wrote tools/out/icon.svg');
