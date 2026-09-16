import { useMemo } from 'react';

import WeatherFitApp from './WeatherFitApp';
import WidgetView from './components/WidgetView';
import IconSheet from './components/IconSheet';

/**
 * Entry points, chosen by query string rather than by a router, because there
 * is no navigation between them — the widget is a separate thing to install
 * rather than a page to visit:
 *
 *   (none)          the app
 *   ?view=widget    the compact card, for saving to a home screen
 *   ?view=icons     the garment contact sheet, for checking the artwork
 */
export default function App() {
  const view = useMemo(
    () => new URLSearchParams(window.location.search).get('view'),
    [],
  );

  if (view === 'widget') return <WidgetView />;
  if (view === 'icons') return <IconSheet />;
  return <WeatherFitApp />;
}
