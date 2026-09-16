import { type ChangeEvent } from 'react';
import type { Garment, HourOutfit, OutfitChange, Slot, Units } from '../types';
import { capitalise, clock, supported } from '../lib/notifications';
import { temp } from '../lib/format';
import { skyFor } from '../theme';
import OutfitFigure from './OutfitFigure';
import GarmentIcon from './GarmentIcon';
import SkyScene from './SkyScene';

interface Props {
  hourly: HourOutfit[];
  changes: OutfitChange[];
  upcoming: OutfitChange | null;
  selected: number;
  units: Units;
  alerts: boolean;
  onToggleAlerts: (on: boolean) => void;
  onSelect: (i: number) => void;
  onTest: () => void;
}

/** Outermost first: the order someone would describe an outfit in. */
const SLOT_ORDER: Slot[] = ['outer', 'mid', 'base', 'legs', 'feet', 'accessory'];

const SLOT_LABEL: Record<Slot, string> = {
  outer: 'Outer layer',
  mid: 'Mid layer',
  base: 'Base layer',
  legs: 'Legs',
  feet: 'Feet',
  accessory: 'Carry',
};

/** The garment that decides how an hour looks from the outside. */
function headline(garments: Garment[]): Garment | undefined {
  for (const slot of SLOT_ORDER) {
    const hit = garments.find((g) => g.slot === slot);
    if (hit) return hit;
  }
  return garments[0];
}

export default function OutfitPanel({
  hourly, changes, upcoming, selected, units, alerts,
  onToggleAlerts, onSelect, onTest,
}: Props) {
  const current = hourly[selected];
  if (!current) return null;

  const theme = skyFor(current.hour);
  const pieces = [...current.outfit.garments].sort(
    (a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot),
  );

  return (
    <section className="wf-outfit" aria-label="What to wear">
      <header className="wf-outfit__head">
        <div className="wf-outfit__title">
          <span className="wf-outfit__badge" aria-hidden="true">
            <GarmentIcon
              id={headline(current.outfit.garments)?.id ?? 'tee'}
              tone={headline(current.outfit.garments)?.tone ?? 'base'}
              size={26}
            />
          </span>
          <h2>What to wear</h2>
        </div>
        <span className="wf-outfit__when">
          {selected === 0 ? 'Right now' : `At ${clock(current.hour.time)}`}
        </span>
      </header>

      <div className="wf-outfit__body">
        {/* The figure, standing in the weather it is dressed for. */}
        <div className="wf-outfit__stage" style={{ color: theme.ink }}>
          <SkyScene theme={theme} className="wf-outfit__sky" />
          <OutfitFigure
            garments={current.outfit.garments}
            className="wf-outfit__figure"
          />
          <span className="wf-outfit__temp">{temp(current.hour.tempC, units)}</span>
        </div>

        <div className="wf-outfit__detail">
          <p className="wf-outfit__note">{current.outfit.note}</p>

          <ul className="wf-pieces">
            {pieces.map((g, i) => (
              <li
                key={g.id}
                className="wf-piece"
                style={{ animationDelay: `${i * 45}ms` }}
              >
                <span className="wf-piece__art">
                  <GarmentIcon id={g.id} tone={g.tone} size={46} />
                </span>
                <span className="wf-piece__text">
                  <span className="wf-piece__name">{g.label}</span>
                  <span className="wf-piece__slot">{SLOT_LABEL[g.slot]}</span>
                </span>
              </li>
            ))}
          </ul>

          {current.outfit.reasons.length > 0 && (
            <ul className="wf-reasons">
              {current.outfit.reasons.map((r) => (
                <li key={r} className="wf-chip">{r}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Clothes by hour: the outermost layer of each hour, so the moment the
          outfit changes is visible as a change of picture. */}
      <div className="wf-outfit__rail" role="tablist" aria-label="Clothing by hour">
        {hourly.map((item, i) => {
          const lead = headline(item.outfit.garments);
          const changesHere = changes.some((c) => c.index === i);

          return (
            <button
              key={item.hour.time}
              type="button"
              role="tab"
              aria-selected={i === selected}
              title={item.outfit.note}
              onClick={() => onSelect(i)}
              className={[
                'wf-railitem',
                i === selected ? 'wf-railitem--on' : '',
                changesHere ? 'wf-railitem--change' : '',
              ].filter(Boolean).join(' ')}
            >
              {changesHere && <span className="wf-railitem__dot" aria-hidden="true" />}
              <GarmentIcon id={lead?.id ?? 'tee'} tone={lead?.tone ?? 'base'} size={34} />
              <span className="wf-railitem__time">
                {i === 0 ? 'Now' : new Date(item.hour.time).toLocaleTimeString([], { hour: 'numeric' })}
              </span>
              <span className="sr-only">{item.outfit.note}</span>
            </button>
          );
        })}
      </div>

      <div className="wf-outfit__foot">
        <div className="wf-changes">
          <h3 className="wf-changes__title">Changes today</h3>

          {changes.length === 0 ? (
            <p className="wf-changes__steady">
              One outfit covers the next {hourly.length} hours.
            </p>
          ) : (
            <ol className="wf-changes__list">
              {changes.map((c) => (
                <li key={`${c.index}-${c.time}`} className="wf-change">
                  <button
                    type="button"
                    className="wf-change__row"
                    onClick={() => onSelect(c.index)}
                  >
                    <span className="wf-change__time">{clock(c.time)}</span>

                    <span className="wf-change__art" aria-hidden="true">
                      {c.added.map((g) => (
                        <span key={`a-${g.id}`} className="wf-change__item wf-change__item--add">
                          <GarmentIcon id={g.id} tone={g.tone} size={30} />
                        </span>
                      ))}
                      {c.removed.map((g) => (
                        <span key={`r-${g.id}`} className="wf-change__item wf-change__item--drop">
                          <GarmentIcon id={g.id} tone={g.tone} size={30} />
                        </span>
                      ))}
                    </span>

                    <span className="wf-change__what">{capitalise(c.instruction)}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="wf-alerts">
          <div className="wf-alerts__copy">
            <label className="wf-alerts__title" htmlFor="wf-alerts">
              Tell me when to change
            </label>
            <p className="wf-alerts__body">
              {supported()
                ? upcoming
                  ? `Next: ${capitalise(upcoming.instruction)} around ${clock(upcoming.time)}. Alerts arrive 45 minutes ahead, while this tab is open.`
                  : 'Nothing to change for now. Alerts arrive 45 minutes ahead, while this tab is open.'
                : 'This browser does not support notifications.'}
            </p>
            {alerts && supported() && (
              <button type="button" className="wf-link" onClick={onTest}>
                Send a test notification
              </button>
            )}
          </div>

          <input
            id="wf-alerts"
            type="checkbox"
            className="wf-switch"
            checked={alerts}
            disabled={!supported()}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onToggleAlerts(e.target.checked)}
          />
        </div>
      </div>
    </section>
  );
}
