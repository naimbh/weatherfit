export type Units = 'metric' | 'imperial';

/** A city in the reader's list. Order in the list is the order shown. */
export interface SavedPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** The device-location entry, whose coordinates are resolved at load time. */
  isCurrent?: boolean;
}

export interface HourWeather {
  time: string;            // ISO local time
  tempC: number;
  feelsLikeC: number;
  precipProb: number;      // 0-100
  precipMm: number;
  snowfallCm: number;
  windKph: number;
  gustKph: number;
  uvIndex: number;
  humidity: number;        // 0-100
  cloudCover: number;      // 0-100
  isDay: boolean;
  code: number;            // WMO weather code
}

/** One day of the multi-day outlook. */
export interface DayWeather {
  date: string;            // ISO date, local to the forecast's timezone
  code: number;            // WMO weather code
  tempMaxC: number;
  tempMinC: number;
  precipProb: number;      // 0-100
  precipMm: number;
  windMaxKph: number;
  uvMax: number;
  sunrise: string;
  sunset: string;
}

export interface Forecast {
  placeName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  hours: HourWeather[];
  /** Optional so forecasts cached by earlier versions still load. */
  days?: DayWeather[];
  /** Live reading from the provider, rather than the current hour's slot. */
  current?: HourWeather;
}

/** Every garment the figure can draw, ordered from skin outwards. */
export type GarmentId =
  | 'thermal_top' | 'tank' | 'tee' | 'long_sleeve'
  | 'overshirt' | 'sweater' | 'fleece'
  | 'windbreaker' | 'rain_shell' | 'light_jacket' | 'coat' | 'parka'
  | 'shorts' | 'trousers' | 'thermal_leggings' | 'lined_trousers'
  | 'sandals' | 'sneakers' | 'waterproof_shoes' | 'boots'
  | 'cap' | 'beanie' | 'sunglasses' | 'scarf' | 'gloves' | 'umbrella';

export type Slot = 'base' | 'mid' | 'outer' | 'legs' | 'feet' | 'accessory';

export interface Garment {
  id: GarmentId;
  slot: Slot;
  label: string;
  /** Palette key resolved against the theme at draw time. */
  tone: 'skin' | 'base' | 'knit' | 'shell' | 'denim' | 'dark' | 'alert';
}

export interface Outfit {
  garments: Garment[];
  /** Stable key used to detect when an outfit genuinely differs. */
  signature: string;
  /** One-sentence plain-language note, e.g. "Long sleeve under a light jacket." */
  note: string;
  /** Short reasons driving the choice, for the detail sheet. */
  reasons: string[];
  band: TempBand;
}

export type TempBand =
  | 'blazing' | 'hot' | 'warm' | 'mild' | 'cool'
  | 'chilly' | 'cold' | 'freezing' | 'extreme';

export interface HourOutfit {
  hour: HourWeather;
  outfit: Outfit;
}

export interface OutfitChange {
  /** Index into the HourOutfit list where the change takes effect. */
  index: number;
  time: string;
  /** Plain-language instruction, e.g. "add the rain shell". */
  instruction: string;
  added: Garment[];
  removed: Garment[];
}
