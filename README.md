# WeatherFit

A weather app whose headline card is a picture of what to put on, hour by
hour — with the forecast around it: current conditions, an hourly chart, a
ten-day outlook. React + TypeScript + Vite. No toolchain beyond npm, no
backend, no API key.

```bash
npm install
npm run dev        # http://localhost:5173
```

That is the whole setup.

## Entry points

| URL | What it is |
| --- | --- |
| `/` | The app |
| `/?view=widget` | A compact card, for saving to a home screen |
| `/?view=icons` | The garment contact sheet — every drawing at a size where mistakes show |

Chosen by query string rather than by a router, because there is no navigation
between them: each is a separate thing to open.

## The outfit block

This is the part the rest of the app is arranged around, so it is given a
gradient edge, a warm accent and the full width of the page.

- **The figure wears the actual clothes.** Every garment is drawn from the
  forecast — not picked from stock images — in three passes: the cloth, a
  shadow on the side away from the light, and the collars, cuffs, zips and
  soles that catch it. It stands in the weather it is dressed for.
- **Beside it, the pieces**, each with its own drawing, its name and which
  layer it is. The same 26 drawings carry the clothing everywhere the figure
  is too big to repeat.
- **Clothes by hour**, as a rail of the outermost layer of each hour, so the
  moment the outfit changes is visible as a change of picture. A dot marks the
  hours where it actually changes.
- **A change list with pictures** — the garment going on with a `+`, the one
  coming off greyed with a `−`. Tap a time to see that hour everywhere.
- **Change notifications**, 45 minutes ahead. See the limits below.

Selecting an hour anywhere — the rail, a change, a column of the chart — moves
the hero, the figure and the detail tiles together. The page describes one
moment at a time.

## Places

The list holds as many cities as you like, in whatever order you put them.

- **Add** by search, **reorder** with the arrows, **remove** with the ✕.
- **Star one to make it home** — home is what opens when you come back.
  Your device location is home until you say otherwise, and cannot be removed,
  so there is always somewhere to fall back to.
- Switching cities paints that city's saved forecast immediately and refreshes
  behind it, so it never blanks out.

Everything is remembered between visits: the cities and their order, home, the
last city viewed, °C or °F, the chart tab, and the alert switch. The unit
switch carries through everything — wind, rainfall and the reason chips — and
the hero prints the other scale beside it, `53°F (12°C)`.

## Honest limits

**Notifications only fire while a tab is open.** Browsers cannot wake a closed
tab on a schedule without a push server, so these are timer-based. Backgrounded
is fine; closed is not. Installing to the home screen helps, because the app
tends to stay resident. There is a "send a test notification" button so you can
confirm they work rather than waiting 45 minutes to find out.

Making them fire when closed needs a server with Web Push and VAPID keys, which
would mean an always-on backend. That is a deliberate omission, not an
oversight.

**No true home-screen widgets.** The web has no equivalent of WidgetKit.
`/?view=widget` saved to a home screen is the closest thing, and it opens as a
page rather than rendering on the home screen itself.

**iOS notifications require installing the app.** Safari only allows web
notifications for apps added to the home screen, on iOS 16.4+.

## Verify it

```bash
npm run verify    # typecheck + 29 tests
```

The engine, the garment geometry and the types are plain TypeScript with no DOM
dependency, which is why the tests run under bare Node.

Artwork is the one part that cannot be checked by a test: the bounds test
proves a path is on canvas, not that it looks like a coat. `/?view=icons` is
how the drawings actually get fixed — it puts all 26 garments and the figure in
five sample outfits on one screen. It caught the cap reading as a chef's hat,
the gloves reading as a mug, and every dark garment disappearing against the
dark interface.

## How the suggestion is made

`buildOutfit()` picks one of nine bands from apparent temperature, not the raw
reading, then applies modifiers in priority order: snow beats rain, rain beats
wind, sun protection last. Each band names a base, mid, outer, legs and feet
garment, so the figure always has something to draw.

`detectChanges()` compares consecutive hours and only reports a change when a
garment people care about appears or disappears — a rain shell, boots, a coat,
gloves. Sunglasses coming off at dusk changes the outfit but is filtered out.
Instructions are capped at three garments, outermost first, so an alert reads
"add the rain shell, waterproof shoes and umbrella" rather than listing eight
items.

## Layout

```
src/
  WeatherFitApp.tsx         the app: places, loading, and the page
  App.tsx                   picks the entry point
  lib/outfitEngine.ts       weather -> garments, change detection
  lib/outfitEngine.test.ts  29 tests
  lib/weather.ts            Open-Meteo forecast + geocoding (no API key)
  lib/wmo.ts                weather codes -> label + icon kind
  lib/format.ts             unit conversion and time formatting
  lib/cache.ts              saved places, preferences, per-city forecasts
  lib/notifications.ts      permission, scheduling, service-worker display
  components/
    figureParts.ts          figure geometry as data
    OutfitFigure.tsx        the figure
    GarmentIcon.tsx         26 garment drawings
    OutfitPanel.tsx         the outfit block
    SkyScene.tsx            the animated sky
    WeatherIcon.tsx         condition icons
    HourlyChart.tsx         temperature / precipitation / wind
    DailyForecast.tsx       ten days, with range bars
    PlacesSheet.tsx         add, reorder, star, remove
    WidgetView.tsx          the compact card
    IconSheet.tsx           the contact sheet
  theme.ts                  fabric tones, sky palettes, paint resolution
  styles.css                the whole interface
tools/
  renderIcons.ts            generates the PWA icon from the same figure
  typecheck/                stub declarations for pre-install checking
public/
  sw.js                     offline shell; never caches forecast data
```

## Data

Forecasts come from Open-Meteo, which needs no API key and allows
non-commercial use. Place search is Open-Meteo's geocoder; reverse geocoding
for your own location uses BigDataCloud and degrades to "Your location" if it
fails. No account, no key, no backend.

The last forecast for each city is kept with a timestamp and shown with a note
saying how old it is, rather than silently serving stale weather.

## Known gaps

- **The outfit can flip-flop.** When the apparent temperature sits on a band
  boundary, the change list can read "add the shorts" at noon and "lose the
  shorts" an hour later. `detectChanges()` reports every real change; it has no
  hysteresis, and giving it some is the fix.
- **The hero icon can disagree with the outfit.** The icon reports the weather
  code, while the engine dresses for a 45%-and-up chance of rain, so a cloudy
  icon can sit above a figure holding an umbrella. That is the engine being
  deliberately precautionary, not a mismatch to fix in the icon.
- **Freezing and extreme look identical**, because the difference between a
  sweater and a fleece is hidden under the parka.
- **The garment catalog is Western and unisex.** `GARMENT_SHAPES` and the icon
  sheet are the two places to add alternatives; the engine refers to garments
  only by id.
- **The figure is one body.** Proportions, skin tone and hair are fixed.
