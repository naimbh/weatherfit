import type { Garment, GarmentId } from '../types';
import { buildOutfit } from '../lib/outfitEngine';
import GarmentIcon from './GarmentIcon';
import OutfitFigure from './OutfitFigure';

/**
 * `?view=icons` — a contact sheet of every garment drawing, at a size where
 * mistakes are obvious, next to the figure wearing a few sample outfits.
 *
 * This replaces the old screenshot harness. Artwork is the one part of this
 * app that cannot be checked by a test: the bounds test proves a path is on
 * canvas, not that it looks like a coat. Being able to see all 26 at once is
 * how the drawings get fixed.
 */

const CATALOG: { id: GarmentId; tone: Garment['tone']; label: string }[] = [
  { id: 'tank', tone: 'base', label: 'tank top' },
  { id: 'tee', tone: 'base', label: 't-shirt' },
  { id: 'long_sleeve', tone: 'base', label: 'long sleeve' },
  { id: 'thermal_top', tone: 'base', label: 'thermal top' },
  { id: 'overshirt', tone: 'denim', label: 'overshirt' },
  { id: 'sweater', tone: 'knit', label: 'sweater' },
  { id: 'fleece', tone: 'knit', label: 'fleece' },
  { id: 'windbreaker', tone: 'shell', label: 'windbreaker' },
  { id: 'light_jacket', tone: 'shell', label: 'light jacket' },
  { id: 'rain_shell', tone: 'alert', label: 'rain shell' },
  { id: 'coat', tone: 'dark', label: 'coat' },
  { id: 'parka', tone: 'dark', label: 'insulated parka' },
  { id: 'shorts', tone: 'denim', label: 'shorts' },
  { id: 'trousers', tone: 'denim', label: 'trousers' },
  { id: 'lined_trousers', tone: 'dark', label: 'lined trousers' },
  { id: 'thermal_leggings', tone: 'dark', label: 'thermal leggings' },
  { id: 'sandals', tone: 'knit', label: 'sandals' },
  { id: 'sneakers', tone: 'dark', label: 'sneakers' },
  { id: 'waterproof_shoes', tone: 'dark', label: 'waterproof shoes' },
  { id: 'boots', tone: 'dark', label: 'insulated boots' },
  { id: 'cap', tone: 'base', label: 'cap' },
  { id: 'beanie', tone: 'knit', label: 'beanie' },
  { id: 'sunglasses', tone: 'dark', label: 'sunglasses' },
  { id: 'scarf', tone: 'knit', label: 'scarf' },
  { id: 'gloves', tone: 'knit', label: 'gloves' },
  { id: 'umbrella', tone: 'dark', label: 'umbrella' },
];

const SAMPLES = [
  { label: 'Blazing, high UV', feelsLikeC: 33, uvIndex: 9, code: 0 },
  { label: 'Mild', feelsLikeC: 18, uvIndex: 3, code: 2 },
  { label: 'Cool and raining', feelsLikeC: 13, uvIndex: 1, code: 63, precipMm: 2 },
  { label: 'Cold', feelsLikeC: 3, uvIndex: 1, code: 3 },
  { label: 'Freezing snow', feelsLikeC: -6, uvIndex: 0, code: 73, snowfallCm: 2 },
];

export default function IconSheet() {
  return (
    <div className="wf-app wf-sheetview">
      <h1>Garment drawings</h1>

      <div className="wf-iconsheet">
        {CATALOG.map((g) => (
          <figure key={g.id} className="wf-iconsheet__cell">
            <GarmentIcon id={g.id} tone={g.tone} size={92} />
            <figcaption>{g.label}</figcaption>
          </figure>
        ))}
      </div>

      <h1>The figure</h1>

      <div className="wf-iconsheet wf-iconsheet--wide">
        {SAMPLES.map((s) => {
          const outfit = buildOutfit({
            time: '2026-09-16T12:00',
            tempC: s.feelsLikeC,
            feelsLikeC: s.feelsLikeC,
            precipProb: s.precipMm ? 90 : 5,
            precipMm: s.precipMm ?? 0,
            snowfallCm: s.snowfallCm ?? 0,
            windKph: 12,
            gustKph: 18,
            uvIndex: s.uvIndex,
            humidity: 60,
            cloudCover: 40,
            isDay: true,
            code: s.code,
          });

          return (
            <figure key={s.label} className="wf-iconsheet__cell wf-iconsheet__cell--figure">
              <OutfitFigure garments={outfit.garments} className="wf-iconsheet__figure" />
              <figcaption>{s.label}</figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
