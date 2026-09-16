import { useMemo } from 'react';
import type { Garment } from '../types';
import { paintColor } from '../theme';
import {
  BODY, GARMENT_SHAPES, HAIR, HEAD_COVERING, VIEWBOX, viewBoxAttr, type Shape,
} from './figureParts';

interface Props {
  garments: Garment[];
  className?: string;
}

/** Renders one garment's shapes, plus a reflected copy of any marked as a
 *  mirrored pair. Returned as an array rather than wrapped in a component so
 *  callers do not need to invent keys for a purely structural element. */
function renderShapes(shapes: Shape[], tone: Garment['tone'], prefix: string) {
  const draw = (s: Shape, key: string) => {
    const paint = {
      fill: paintColor(s.fill, tone),
      stroke: s.stroke ? paintColor(s.stroke, tone) : undefined,
      strokeWidth: s.strokeWidth,
      strokeLinecap: 'round' as const,
      opacity: s.opacity,
    };
    if (s.kind === 'circle') return <circle key={key} cx={s.cx} cy={s.cy} r={s.r} {...paint} />;
    if (s.kind === 'rect') {
      return <rect key={key} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} {...paint} />;
    }
    return <path key={key} d={s.d} {...paint} />;
  };

  const drawn = shapes.map((s, i) => draw(s, `${prefix}-${i}`));
  const mirrored = shapes.filter((s) => s.mirror);
  if (mirrored.length === 0) return drawn;

  return [
    ...drawn,
    <g key={`${prefix}-mirror`} transform={`translate(${VIEWBOX.width}, 0) scale(-1, 1)`}>
      {mirrored.map((s, i) => draw(s, `${prefix}-m-${i}`))}
    </g>,
  ];
}

export default function OutfitFigure({ garments, className }: Props) {
  const wearsHat = useMemo(
    () => garments.some((g) => HEAD_COVERING.includes(g.id)),
    [garments],
  );
  const label = garments.length
    ? `Figure wearing ${garments.map((g) => g.label).join(', ')}`
    : 'Figure with no outfit yet';

  return (
    <svg className={className} viewBox={viewBoxAttr()} role="img" aria-label={label}>
      {renderShapes(BODY, 'skin', 'body')}
      {!wearsHat && renderShapes(HAIR, 'skin', 'hair')}
      {garments.map((g) => renderShapes(GARMENT_SHAPES[g.id] ?? [], g.tone, g.id))}
    </svg>
  );
}
