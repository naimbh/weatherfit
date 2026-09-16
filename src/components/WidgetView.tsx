import { useEffect, useState } from 'react';
import type { Forecast, Units } from '../types';
import { buildHourlyOutfits, detectChanges, nextChange, outfitSummary } from '../lib/outfitEngine';
import { fetchForecast, fromNow, getCoords } from '../lib/weather';
import { capitalise, clock } from '../lib/notifications';
import { temp } from '../lib/format';
import { skyFor } from '../theme';
import {
  ageInMinutes, isUsable, loadForecast, loadHomeId, loadPlaces, loadUnits, saveForecast,
} from '../lib/cache';
import OutfitFigure from './OutfitFigure';
import SkyScene from './SkyScene';

/**
 * `?view=widget` renders this and nothing else, so it can be saved to a home
 * screen as its own icon — the closest the web gets to a native widget. It
 * reads the same saved places the full app does and shows the starred one.
 */
export default function WidgetView() {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [units, setUnits] = useState<Units>('metric');

  useEffect(() => {
    const home = loadHomeId();
    const place = loadPlaces().find((p) => p.id === home);
    setUnits(loadUnits());

    const cached = loadForecast(home);
    if (isUsable(cached)) setForecast(cached.forecast);

    // Only go to the network when the saved copy is old enough to matter.
    if (!place || (cached && ageInMinutes(cached) < 30)) return;

    void (async () => {
      const coords = place.isCurrent
        ? await getCoords()
        : { lat: place.latitude, lon: place.longitude };
      if (!coords) return;

      try {
        const data = await fetchForecast(
          coords.lat, coords.lon, place.isCurrent ? undefined : place.name,
        );
        setForecast(data);
        saveForecast(home, data);
      } catch {
        // The cached copy above is the fallback.
      }
    })();
  }, []);

  if (!forecast) {
    return <a className="wf-widget wf-widget--empty" href="/">Open WeatherFit once to set this up.</a>;
  }

  const hourly = buildHourlyOutfits(fromNow(forecast.hours, 24), units);
  const current = hourly[0];
  if (!current) return <a className="wf-widget wf-widget--empty" href="/">No forecast yet.</a>;

  const upcoming = nextChange(hourly, detectChanges(hourly));
  const theme = skyFor(current.hour);

  return (
    <a className="wf-widget" href="/" aria-label="Open the full forecast" style={{ color: theme.ink }}>
      <SkyScene theme={theme} className="wf-widget__sky" horizon={false} />
      <OutfitFigure garments={current.outfit.garments} className="wf-widget__figure" />
      <span className="wf-widget__body">
        <span className="wf-widget__temp">{temp(current.hour.tempC, units)}</span>
        <span className="wf-widget__label">
          {outfitSummary(current.outfit.garments) || current.outfit.band}
        </span>
        {upcoming && (
          <span className="wf-widget__next">
            {capitalise(upcoming.instruction)} at {clock(upcoming.time)}
          </span>
        )}
      </span>
    </a>
  );
}
