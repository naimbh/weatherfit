import type { ReactNode } from 'react';
import type { IconKind } from '../lib/wmo';

interface Props {
  kind: IconKind;
  isDay?: boolean;
  size?: number;
  className?: string;
  /** Icons sit beside their own text label almost everywhere, so they are
   *  decorative by default. Pass a label where the icon stands alone. */
  label?: string;
}

const SUN = '#FBBC04';
const MOON = '#E3E7EE';
const CLOUD = '#C6CCD4';
const CLOUD_DARK = '#9AA2AD';
const WET = '#4E9CF5';
const ICE = '#BBDEFB';

/** The cloud is assembled from overlapping circles rather than one path: the
 *  union reads as a cloud at 24px and at 160px, and the silhouette stays
 *  identical when a second, darker cloud is layered behind it. */
function Cloud({ fill, dx = 0, dy = 0 }: { fill: string; dx?: number; dy?: number }) {
  return (
    <g fill={fill} transform={`translate(${dx} ${dy})`}>
      <circle cx={17.5} cy={27} r={7} />
      <circle cx={27.5} cy={23.5} r={9.5} />
      <circle cx={34} cy={29} r={6} />
      <rect x={14} y={29} width={21} height={7} rx={3.5} />
    </g>
  );
}

function Sun({ cx = 24, cy = 21, r = 8 }: { cx?: number; cy?: number; r?: number }) {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={SUN} />
      <g stroke={SUN} strokeWidth={3} strokeLinecap="round">
        {rays.map((deg) => (
          <line
            key={deg}
            x1={0}
            y1={r + 3.5}
            x2={0}
            y2={r + 7}
            transform={`translate(${cx} ${cy}) rotate(${deg})`}
          />
        ))}
      </g>
    </g>
  );
}

const Moon = () => (
  <path d="M30 10 A12 12 0 1 0 30 34 A9.5 9.5 0 1 1 30 10 Z" fill={MOON} />
);

/** Slanted strokes below the cloud, positioned on a shared baseline so rain,
 *  drizzle and sleet line up when icons sit in a row. */
function Drops({ xs, color = WET, length = 6, width = 3 }: {
  xs: number[]; color?: string; length?: number; width?: number;
}) {
  return (
    <g stroke={color} strokeWidth={width} strokeLinecap="round">
      {xs.map((x) => (
        <line key={x} x1={x + 1.5} y1={39} x2={x - 1.5} y2={39 + length} />
      ))}
    </g>
  );
}

function Flakes({ xs, y = 42 }: { xs: number[]; y?: number }) {
  return (
    <g stroke={ICE} strokeWidth={2.4} strokeLinecap="round">
      {xs.map((x) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <line x1={-3} y1={0} x2={3} y2={0} />
          <line x1={-1.5} y1={-2.6} x2={1.5} y2={2.6} />
          <line x1={1.5} y1={-2.6} x2={-1.5} y2={2.6} />
        </g>
      ))}
    </g>
  );
}

const Bolt = () => (
  <path d="M26 33 L18 43.5 h5 L20.5 50" fill="none" />
);

function art(kind: IconKind, isDay: boolean): ReactNode {
  switch (kind) {
    case 'clear':
      return isDay ? <Sun /> : <Moon />;

    case 'mostly-clear':
      return (
        <>
          {isDay ? <Sun cx={20} cy={18} r={7} /> : <Moon />}
          <Cloud fill={CLOUD} dy={4} />
        </>
      );

    case 'partly-cloudy':
      return (
        <>
          {isDay ? <Sun cx={17} cy={16} r={6.5} /> : <Moon />}
          <Cloud fill={CLOUD} dy={5} />
        </>
      );

    case 'cloudy':
      return (
        <>
          <Cloud fill={CLOUD_DARK} dx={-5} dy={-1} />
          <Cloud fill={CLOUD} dx={3} dy={5} />
        </>
      );

    case 'fog':
      return (
        <>
          <Cloud fill={CLOUD} dy={-3} />
          <g stroke={CLOUD_DARK} strokeWidth={3} strokeLinecap="round">
            <line x1={12} y1={38} x2={36} y2={38} />
            <line x1={16} y1={44} x2={32} y2={44} />
          </g>
        </>
      );

    case 'drizzle':
      return (
        <>
          <Cloud fill={CLOUD} />
          <Drops xs={[19, 26, 33]} length={3.5} width={2.6} />
        </>
      );

    case 'rain':
      return (
        <>
          <Cloud fill={CLOUD} />
          <Drops xs={[19, 26, 33]} />
        </>
      );

    case 'heavy-rain':
      return (
        <>
          <Cloud fill={CLOUD_DARK} />
          <Drops xs={[16, 22, 28, 34]} length={7.5} />
        </>
      );

    case 'sleet':
      return (
        <>
          <Cloud fill={CLOUD} />
          <Drops xs={[19, 32]} length={5} />
          <Flakes xs={[26]} y={42} />
        </>
      );

    case 'snow':
      return (
        <>
          <Cloud fill={CLOUD} />
          <Flakes xs={[18, 26, 34]} />
        </>
      );

    case 'thunder':
      return (
        <>
          <Cloud fill={CLOUD_DARK} />
          <g stroke={SUN} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
            <Bolt />
          </g>
        </>
      );
  }
}

export default function WeatherIcon({
  kind, isDay = true, size = 40, className, label,
}: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 52"
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {art(kind, isDay)}
    </svg>
  );
}
