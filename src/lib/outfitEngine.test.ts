import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOutfit, buildHourlyOutfits, detectChanges, nextChange,
  isRaining, isSnowing, cToF, formatTemp, outfitSummary,
} from './outfitEngine.ts';
import type { GarmentId, HourWeather, Slot } from '../types.ts';
import {
  BODY, CONTENT_BOUNDS, GARMENT_SHAPES, HAIR, VIEWBOX, VIEW_WINDOW, type Shape,
} from '../components/figureParts.ts';

const hour = (over: Partial<HourWeather> = {}): HourWeather => ({
  time: '2026-09-15T12:00', tempC: 15, feelsLikeC: 15, precipProb: 0,
  precipMm: 0, snowfallCm: 0, windKph: 8, gustKph: 12, uvIndex: 2,
  humidity: 55, cloudCover: 30, isDay: true, code: 1, ...over,
});

const ids = (h: HourWeather): GarmentId[] =>
  buildOutfit(h).garments.map((g) => g.id);
const has = (h: HourWeather, id: GarmentId) => ids(h).includes(id);

describe('temperature bands', () => {
  test('every band produces a complete outfit', () => {
    for (const feelsLikeC of [-25, -12, -6, -1, 0, 5, 6, 10, 11, 15, 16, 19, 20, 24, 25, 29, 30, 45]) {
      const outfit = buildOutfit(hour({ feelsLikeC }));
      const slots = new Set<Slot>(outfit.garments.map((g) => g.slot));
      assert.ok(slots.has('base'), `no base layer at ${feelsLikeC}`);
      assert.ok(slots.has('legs'), `no legwear at ${feelsLikeC}`);
      assert.ok(slots.has('feet'), `no footwear at ${feelsLikeC}`);
      assert.ok(outfit.note.length > 0, `no note at ${feelsLikeC}`);
      assert.ok(outfit.note.endsWith('.'), `note not a sentence at ${feelsLikeC}`);
    }
  });

  test('warmth increases monotonically as it gets colder', () => {
    const weight = (h: HourWeather) =>
      buildOutfit(h).garments.filter(
        (g) => g.slot === 'base' || g.slot === 'mid' || g.slot === 'outer',
      ).length;
    const temps = [32, 27, 22, 18, 13, 8, 3, -3, -12];
    for (let i = 1; i < temps.length; i++) {
      assert.ok(
        weight(hour({ feelsLikeC: temps[i] })) >= weight(hour({ feelsLikeC: temps[i - 1] })),
        `layers dropped going from ${temps[i - 1]} to ${temps[i]}`,
      );
    }
  });

  test('band boundaries do not overlap or leave gaps', () => {
    // 11 is the chilly/cool boundary: below is chilly, at or above is cool.
    assert.equal(buildOutfit(hour({ feelsLikeC: 10.9 })).band, 'chilly');
    assert.equal(buildOutfit(hour({ feelsLikeC: 11 })).band, 'cool');
  });

  test('extreme cold covers the extremities', () => {
    const cold = hour({ feelsLikeC: -20 });
    for (const id of ['beanie', 'gloves', 'scarf', 'boots'] as GarmentId[]) {
      assert.ok(has(cold, id), `missing ${id} at -20`);
    }
  });
});

describe('weather overrides', () => {
  test('rain adds a shell, waterproof shoes and an umbrella', () => {
    const wet = hour({ feelsLikeC: 18, precipProb: 80, precipMm: 1.5, code: 63 });
    assert.ok(has(wet, 'rain_shell'));
    assert.ok(has(wet, 'umbrella'));
    assert.ok(has(wet, 'waterproof_shoes'));
    assert.ok(!has(wet, 'shorts'), 'shorts should be swapped out in the rain');
  });

  test('high probability alone is enough to trigger rain gear', () => {
    assert.ok(has(hour({ precipProb: 60 }), 'rain_shell'));
    assert.ok(!has(hour({ precipProb: 20 }), 'rain_shell'));
  });

  test('snow beats rain and forces boots', () => {
    const snowy = hour({ feelsLikeC: -3, snowfallCm: 2, precipProb: 90, code: 73 });
    assert.ok(has(snowy, 'boots'));
    assert.ok(!has(snowy, 'rain_shell'), 'snow should not produce a rain shell');
    assert.ok(has(snowy, 'gloves'));
  });

  test('wind adds a windbreaker only when nothing warmer is already on', () => {
    assert.ok(has(hour({ feelsLikeC: 23, windKph: 45 }), 'windbreaker'));
    const cold = hour({ feelsLikeC: 2, windKph: 45 });
    assert.ok(!has(cold, 'windbreaker'), 'a coat already handles the wind');
    assert.ok(has(cold, 'coat'));
  });

  test('sun protection only in daylight and only when dry', () => {
    assert.ok(has(hour({ uvIndex: 8, isDay: true }), 'sunglasses'));
    assert.ok(!has(hour({ uvIndex: 8, isDay: false }), 'sunglasses'));
    assert.ok(!has(hour({ uvIndex: 8, isDay: true, precipProb: 90, code: 63 }), 'sunglasses'));
  });

  test('exactly one garment per exclusive slot', () => {
    const cases = [
      hour({ feelsLikeC: 30 }), hour({ feelsLikeC: -15 }),
      hour({ feelsLikeC: 12, precipProb: 90, code: 65 }),
      hour({ feelsLikeC: -2, snowfallCm: 3, code: 75 }),
      hour({ feelsLikeC: 20, windKph: 50, uvIndex: 9 }),
    ];
    for (const h of cases) {
      for (const slot of ['base', 'mid', 'outer', 'legs', 'feet'] as Slot[]) {
        const count = buildOutfit(h).garments.filter((g) => g.slot === slot).length;
        assert.ok(count <= 1, `${count} items in ${slot} for ${JSON.stringify(h.feelsLikeC)}`);
      }
    }
  });
});

describe('drawability', () => {
  test('every garment the engine can pick has geometry to draw', () => {
    const seen = new Set<GarmentId>();
    for (let t = -30; t <= 45; t += 1) {
      for (const over of [
        {}, { precipProb: 90, precipMm: 2, code: 63 }, { snowfallCm: 2, code: 73 },
        { windKph: 50 }, { uvIndex: 9 }, { isDay: false },
      ]) {
        ids(hour({ feelsLikeC: t, ...over })).forEach((id) => seen.add(id));
      }
    }
    assert.ok(seen.size > 15, `only ${seen.size} garments reachable`);
    for (const id of seen) {
      assert.ok(
        (GARMENT_SHAPES[id]?.length ?? 0) > 0,
        `${id} is reachable but has no shapes`,
      );
    }
  });
});

describe('change detection', () => {
  const series = (temps: number[], over: Partial<HourWeather>[] = []) =>
    buildHourlyOutfits(
      temps.map((feelsLikeC, i) =>
        hour({
          feelsLikeC,
          time: `2026-09-15T${String(6 + i).padStart(2, '0')}:00`,
          ...(over[i] ?? {}),
        }),
      ),
    );

  test('a steady day reports no changes', () => {
    assert.equal(detectChanges(series([15, 15.2, 14.8, 15, 15.1])).length, 0);
  });

  test('rain arriving mid-afternoon is reported once', () => {
    const list = series(
      [18, 18, 18, 17, 17],
      [{}, {}, {}, { precipProb: 90, precipMm: 2, code: 63 }, { precipProb: 90, precipMm: 2, code: 63 }],
    );
    const changes = detectChanges(list);
    assert.equal(changes.length, 1);
    assert.equal(changes[0].index, 3);
    assert.match(changes[0].instruction, /rain shell/);
  });

  test('instructions name at most three garments', () => {
    const list = series([22, -18]);
    for (const change of detectChanges(list)) {
      const named = change.instruction.split(/,| and /).length;
      assert.ok(named <= 3, `instruction named ${named} items: ${change.instruction}`);
    }
  });

  test('instructions read as imperative phrases', () => {
    const list = series([20, 8, 2, 20]);
    for (const change of detectChanges(list)) {
      assert.match(change.instruction, /^(add|lose|swap) the /);
      assert.ok(!change.instruction.includes('  '), 'double space in instruction');
      assert.ok(!/,\s*and/.test(change.instruction), 'stray comma before and');
    }
  });

  test('cosmetic-only differences are not announced', () => {
    // Sunglasses coming off at dusk changes the signature but warrants no alert.
    const list = buildHourlyOutfits([
      hour({ feelsLikeC: 22, uvIndex: 8, isDay: true, time: '2026-09-15T17:00' }),
      hour({ feelsLikeC: 22, uvIndex: 0, isDay: false, time: '2026-09-15T18:00' }),
    ]);
    assert.notEqual(list[0].outfit.signature, list[1].outfit.signature);
    assert.equal(detectChanges(list).length, 0);
  });

  test('nextChange respects the clock', () => {
    const list = series([20, 20, 2, 2]);
    const changes = detectChanges(list);
    assert.ok(changes.length > 0);
    const before = new Date('2026-09-15T06:30');
    const after = new Date('2026-09-15T23:00');
    assert.ok(nextChange(list, changes, before) !== null);
    assert.equal(nextChange(list, changes, after), null);
  });

  test('handles empty and single-hour forecasts', () => {
    assert.deepEqual(detectChanges([]), []);
    assert.deepEqual(detectChanges(series([15])), []);
    assert.equal(nextChange([], [], new Date()), null);
  });
});

describe('condition predicates', () => {
  test('rain detected from code, amount or probability', () => {
    assert.ok(isRaining(hour({ code: 61 })));
    assert.ok(isRaining(hour({ precipMm: 0.5 })));
    assert.ok(isRaining(hour({ precipProb: 50 })));
    assert.ok(!isRaining(hour()));
  });

  test('snow detected independently of rain', () => {
    assert.ok(isSnowing(hour({ code: 75 })));
    assert.ok(isSnowing(hour({ snowfallCm: 0.4 })));
    assert.ok(!isSnowing(hour({ code: 61 })));
  });
});

describe('units', () => {
  test('conversion and formatting', () => {
    assert.equal(cToF(0), 32);
    assert.equal(cToF(100), 212);
    assert.equal(formatTemp(21.4, 'metric'), '21°');
    assert.equal(formatTemp(0, 'imperial'), '32°');
    assert.equal(formatTemp(-0.4, 'metric'), '0°', 'negative zero should not render as -0');
  });
});

describe('geometry bounds', () => {
  /**
   * Walks the subset of path syntax this project uses (M, h, l, v, q, z),
   * tracking the current point so relative commands resolve correctly.
   * Control points are included, which over-estimates curve extent — a
   * conservative bound is the right side to err on here.
   */
  function pathPoints(d: string): { x: number; y: number }[] {
    const tokens = d.match(/[MmLlHhVvQqZz]|-?\d+(?:\.\d+)?/g) ?? [];
    const pts: { x: number; y: number }[] = [];
    let x = 0, y = 0, startX = 0, startY = 0;
    let i = 0, cmd = '';

    const num = () => Number(tokens[i++]);
    const push = () => pts.push({ x, y });

    while (i < tokens.length) {
      if (/[MmLlHhVvQqZz]/.test(tokens[i])) cmd = tokens[i++];
      switch (cmd) {
        case 'M': x = num(); y = num(); startX = x; startY = y; push(); cmd = 'L'; break;
        case 'm': x += num(); y += num(); startX = x; startY = y; push(); cmd = 'l'; break;
        case 'L': x = num(); y = num(); push(); break;
        case 'l': x += num(); y += num(); push(); break;
        case 'H': x = num(); push(); break;
        case 'h': x += num(); push(); break;
        case 'V': y = num(); push(); break;
        case 'v': y += num(); push(); break;
        case 'Q': {
          const cx = num(), cy = num();
          pts.push({ x: cx, y: cy });
          x = num(); y = num(); push(); break;
        }
        case 'q': {
          const cx = x + num(), cy = y + num();
          pts.push({ x: cx, y: cy });
          x += num(); y += num(); push(); break;
        }
        case 'Z': case 'z': x = startX; y = startY; i++; break;
        default: i++; break;
      }
    }
    return pts;
  }

  const bounds = (s: Shape): { x: number; y: number }[] => {
    if (s.kind === 'rect') {
      return [{ x: s.x!, y: s.y! }, { x: s.x! + s.w!, y: s.y! + s.h! }];
    }
    if (s.kind === 'circle') {
      return [{ x: s.cx! - s.r!, y: s.cy! - s.r! }, { x: s.cx! + s.r!, y: s.cy! + s.r! }];
    }
    return pathPoints(s.d!);
  };

  test('the path parser handles relative commands', () => {
    const pts = pathPoints('M58 126 h44 l-2 34 z');
    assert.deepEqual(pts[0], { x: 58, y: 126 });
    assert.deepEqual(pts[1], { x: 102, y: 126 });
    assert.deepEqual(pts[2], { x: 100, y: 160 });
  });

  test('no shape is drawn outside the canvas, before or after mirroring', () => {
    for (const [id, shapes] of Object.entries(GARMENT_SHAPES)) {
      for (const s of shapes) {
        for (const pt of bounds(s)) {
          const xs = s.mirror ? [pt.x, VIEWBOX.width - pt.x] : [pt.x];
          for (const x of xs) {
            assert.ok(x >= -2 && x <= VIEWBOX.width + 2, `${id}: x=${x} off canvas`);
          }
          assert.ok(
            pt.y >= -2 && pt.y <= VIEWBOX.height + 2,
            `${id}: y=${pt.y} off canvas`,
          );
        }
      }
    }
  });

  test('mirrored shapes are declared left of centre so reflection lands right', () => {
    for (const [id, shapes] of Object.entries(GARMENT_SHAPES)) {
      for (const s of shapes.filter((x) => x.mirror)) {
        const pts = bounds(s);
        const centre = pts.reduce((a, p) => a + p.x, 0) / pts.length;
        assert.ok(
          centre < VIEWBOX.width / 2,
          `${id}: mirrored shape is not left of centre (${centre.toFixed(1)})`,
        );
      }
    }
  });
});

describe('outfit summary', () => {
  test('names the outermost layers, not whatever is drawn first', () => {
    // The garments array is in draw order, so the base layer comes first.
    // The summary must still lead with the coat.
    const cold = buildOutfit(hour({ feelsLikeC: 2 }));
    assert.match(outfitSummary(cold.garments), /^coat/);
  });

  test('falls back gracefully when there are few layers', () => {
    const hot = buildOutfit(hour({ feelsLikeC: 33 }));
    const summary = outfitSummary(hot.garments);
    assert.ok(summary.length > 0);
    assert.ok(!summary.includes('undefined'));
  });

  test('respects the limit', () => {
    const cold = buildOutfit(hour({ feelsLikeC: -10 }));
    assert.equal(outfitSummary(cold.garments, 1).includes('+'), false);
    assert.equal(outfitSummary(cold.garments, 2).split(' + ').length, 2);
  });
});

describe('declared content bounds', () => {
  /**
   * CONTENT_BOUNDS is hardcoded and used to centre the app icon and to choose
   * the visible crop. If someone edits a garment path, these must not silently
   * go stale, so recompute them here from the geometry itself.
   */
  test('match what the geometry actually draws', () => {
    const all: Shape[] = [...BODY, ...HAIR, ...Object.values(GARMENT_SHAPES).flat()];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (const s of all) {
      const pts = s.kind === 'rect'
        ? [{ x: s.x!, y: s.y! }, { x: s.x! + s.w!, y: s.y! + s.h! }]
        : s.kind === 'circle'
          ? [{ x: s.cx! - s.r!, y: s.cy! - s.r! }, { x: s.cx! + s.r!, y: s.cy! + s.r! }]
          : pathPointsShared(s.d!);

      for (const pt of pts) {
        const xs = s.mirror ? [pt.x, VIEWBOX.width - pt.x] : [pt.x];
        for (const x of xs) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
        minY = Math.min(minY, pt.y);
        maxY = Math.max(maxY, pt.y);
      }
    }

    assert.deepEqual(
      { minX, maxX, minY, maxY },
      { ...CONTENT_BOUNDS },
      'CONTENT_BOUNDS is stale — update it in figureParts.ts',
    );
  });

  test('the visible crop contains all of the content', () => {
    assert.ok(VIEW_WINDOW.x <= CONTENT_BOUNDS.minX, 'crop cuts the left edge');
    assert.ok(
      VIEW_WINDOW.x + VIEW_WINDOW.width >= CONTENT_BOUNDS.maxX,
      'crop cuts the right edge',
    );
    assert.ok(VIEW_WINDOW.y <= CONTENT_BOUNDS.minY, 'crop cuts the top');
    assert.ok(
      VIEW_WINDOW.y + VIEW_WINDOW.height >= CONTENT_BOUNDS.maxY,
      'crop cuts the feet',
    );
  });
});

/** Shared with the bounds suite above; handles the path subset used here. */
function pathPointsShared(d: string): { x: number; y: number }[] {
  const tokens = d.match(/[MmLlHhVvQqZz]|-?\d+(?:\.\d+)?/g) ?? [];
  const pts: { x: number; y: number }[] = [];
  let x = 0, y = 0, startX = 0, startY = 0, i = 0, cmd = '';
  const num = () => Number(tokens[i++]);
  const push = () => pts.push({ x, y });

  while (i < tokens.length) {
    if (/[MmLlHhVvQqZz]/.test(tokens[i])) cmd = tokens[i++];
    switch (cmd) {
      case 'M': x = num(); y = num(); startX = x; startY = y; push(); cmd = 'L'; break;
      case 'm': x += num(); y += num(); startX = x; startY = y; push(); cmd = 'l'; break;
      case 'L': x = num(); y = num(); push(); break;
      case 'l': x += num(); y += num(); push(); break;
      case 'H': x = num(); push(); break;
      case 'h': x += num(); push(); break;
      case 'V': y = num(); push(); break;
      case 'v': y += num(); push(); break;
      case 'Q': { const cx = num(), cy = num(); pts.push({ x: cx, y: cy }); x = num(); y = num(); push(); break; }
      case 'q': { const cx = x + num(), cy = y + num(); pts.push({ x: cx, y: cy }); x += num(); y += num(); push(); break; }
      case 'Z': case 'z': x = startX; y = startY; i++; break;
      default: i++; break;
    }
  }
  return pts;
}
