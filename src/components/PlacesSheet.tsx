import { useEffect, useState, type ChangeEvent } from 'react';
import type { SavedPlace } from '../types';
import { searchPlaces, type Place } from '../lib/weather';

interface Props {
  places: SavedPlace[];
  homeId: string;
  selectedId: string;
  onAdd: (place: Place) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onSetHome: (id: string) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}

const Star = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path
      d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * The city list, and the only place cities are added, ordered or removed.
 *
 * The starred city is the one the app opens on. The device-location entry is
 * starred to begin with and can never be deleted, so there is always
 * somewhere to fall back to when a saved city is removed.
 */
export default function PlacesSheet({
  places, homeId, selectedId, onAdd, onRemove, onMove, onSetHome, onSelect, onClose,
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Debounced so typing a city name does not fire a request per keystroke.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setMessage(null);
      return;
    }

    let cancelled = false;
    setBusy(true);

    const timer = window.setTimeout(async () => {
      try {
        const found = await searchPlaces(trimmed);
        if (cancelled) return;
        setResults(found);
        setMessage(found.length === 0 ? 'No places match that name.' : null);
      } catch {
        if (!cancelled) setMessage('Place search is unavailable. Check your connection.');
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 350);

    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [query]);

  return (
    <div className="wf-sheet" role="dialog" aria-modal="true" aria-label="Your places">
      <div className="wf-sheet__scrim" onClick={onClose} />

      <div className="wf-sheet__card">
        <header className="wf-sheet__head">
          <h2>Your places</h2>
          <button type="button" className="wf-sheet__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <input
          className="wf-input"
          value={query}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          placeholder="Add a city — Syracuse, Lisbon, Osaka"
          autoFocus
          autoComplete="off"
          aria-label="Search for a city to add"
        />

        {busy && <p className="wf-sheet__note">Searching…</p>}
        {message && !busy && <p className="wf-sheet__note">{message}</p>}

        {results.length > 0 && (
          <ul className="wf-results">
            {results.map((place) => (
              <li key={`${place.latitude},${place.longitude}`}>
                <button
                  type="button"
                  className="wf-result"
                  onClick={() => { onAdd(place); setQuery(''); setResults([]); }}
                >
                  <span>{place.name}</span>
                  <span className="wf-result__add" aria-hidden="true">+</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <ul className="wf-places">
          {places.map((place, i) => {
            const isHome = place.id === homeId;
            return (
              <li
                key={place.id}
                className={`wf-place${place.id === selectedId ? ' wf-place--on' : ''}`}
              >
                <span className="wf-place__order">
                  <button
                    type="button"
                    className="wf-place__move"
                    disabled={i === 0}
                    onClick={() => onMove(place.id, -1)}
                    aria-label={`Move ${place.name} up`}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="wf-place__move"
                    disabled={i === places.length - 1}
                    onClick={() => onMove(place.id, 1)}
                    aria-label={`Move ${place.name} down`}
                  >
                    ▼
                  </button>
                </span>

                <button
                  type="button"
                  className="wf-place__name"
                  onClick={() => { onSelect(place.id); onClose(); }}
                >
                  {place.isCurrent && <span className="wf-place__pin" aria-hidden="true">◎</span>}
                  {place.name}
                  {isHome && <span className="wf-place__tag">Home</span>}
                </button>

                <button
                  type="button"
                  className={`wf-place__star${isHome ? ' wf-place__star--on' : ''}`}
                  onClick={() => onSetHome(place.id)}
                  aria-pressed={isHome}
                  aria-label={`Open ${place.name} by default`}
                >
                  <Star filled={isHome} />
                </button>

                <button
                  type="button"
                  className="wf-place__remove"
                  onClick={() => onRemove(place.id)}
                  disabled={!!place.isCurrent}
                  aria-label={`Remove ${place.name}`}
                  title={place.isCurrent ? 'Your location cannot be removed' : undefined}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>

        <p className="wf-sheet__hint">
          The starred place opens when you come back. Arrows reorder the list.
        </p>
      </div>
    </div>
  );
}
