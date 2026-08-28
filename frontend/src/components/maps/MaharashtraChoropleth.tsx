import React, { useMemo, useState, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  MAHARASHTRA_GEO,
  GEO_WIDTH,
  GEO_HEIGHT,
  type DistrictShape,
} from '../../data/maharashtraGeo';

export interface ChoroplethDatum {
  /** Numeric value driving the colour ramp. */
  value: number;
  /** Rows shown in the hover tooltip. */
  detail?: { label: string; value: string }[];
}

export type RampName = 'teal' | 'saffron' | 'severity';

/**
 * Colour ramps, light -> dark. Each is a single-hue sequence so the ordering
 * is readable to viewers with colour-vision deficiency: lightness carries the
 * information, hue only carries the theme.
 */
const RAMPS: Record<RampName, string[]> = {
  teal: ['#f0fdf9', '#ccfbf1', '#5eead4', '#14b8a6', '#0f766e', '#134e4a'],
  saffron: ['#fef8ee', '#fdedd3', '#f6bb6d', '#e8871e', '#b45412', '#753815'],
  severity: ['#f0fdf9', '#fdedd3', '#f6bb6d', '#e8871e', '#dc2626', '#991b1b'],
};

/** Ink that stays legible on a given ramp step. */
const LABEL_INK = ['#2d2418', '#2d2418', '#2d2418', '#2d2418', '#ffffff', '#ffffff'];

export interface MaharashtraChoroplethProps {
  /** District name -> datum. Districts absent from the map render as "no data". */
  data: Record<string, ChoroplethDatum>;
  /** Legend heading, e.g. "Available ICU beds". */
  metricLabel: string;
  ramp?: RampName;
  selected?: string;
  onSelect?: (district: string) => void;
  /** Formats values in the legend and tooltip. */
  format?: (n: number) => string;
  className?: string;
  /** Renders district names on the map. Off below ~640px automatically. */
  showLabels?: boolean;
}

export const MaharashtraChoropleth: React.FC<MaharashtraChoroplethProps> = ({
  data,
  metricLabel,
  ramp = 'teal',
  selected,
  onSelect,
  format = (n) => n.toLocaleString('en-IN'),
  className,
  showLabels = true,
}) => {
  const [hovered, setHovered] = useState<DistrictShape | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);

  const colors = RAMPS[ramp];

  // Quantile-ish bucketing over the observed range. A linear scale collapses
  // when one district dwarfs the rest (Mumbai routinely does), so the buckets
  // are built from sorted values rather than min/max alone.
  const { thresholds, min, max } = useMemo(() => {
    const values = Object.values(data)
      .map((d) => d.value)
      .filter((v) => Number.isFinite(v))
      .sort((a, b) => a - b);

    if (values.length === 0) return { thresholds: [] as number[], min: 0, max: 0 };

    const steps = colors.length;
    const cuts: number[] = [];
    for (let i = 1; i < steps; i++) {
      const idx = Math.floor((values.length * i) / steps);
      cuts.push(values[Math.min(idx, values.length - 1)]);
    }
    return { thresholds: cuts, min: values[0], max: values[values.length - 1] };
  }, [data, colors.length]);

  const bucketOf = useCallback(
    (value: number) => {
      let i = 0;
      while (i < thresholds.length && value >= thresholds[i]) i++;
      return Math.min(i, colors.length - 1);
    },
    [thresholds, colors.length]
  );

  const handleMove = (e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPointer({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const active = hovered;
  const activeDatum = active ? data[active.name] : undefined;

  return (
    <div
      ref={wrapRef}
      className={twMerge(clsx('relative w-full', className))}
      onMouseMove={handleMove}
      onMouseLeave={() => setHovered(null)}
    >
      <svg
        viewBox={`0 0 ${GEO_WIDTH + 60} ${GEO_HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Map of Maharashtra districts shaded by ${metricLabel}`}
      >
        <defs>
          {/* Soft drop shadow for the selected district only. */}
          <filter id="districtLift" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#4a3f36" floodOpacity="0.35" />
          </filter>
        </defs>

        {MAHARASHTRA_GEO.map((d, i) => {
          const datum = data[d.name];
          const hasData = datum !== undefined && Number.isFinite(datum.value);
          const bucket = hasData ? bucketOf(datum.value) : -1;
          const fill = hasData ? colors[bucket] : '#f5f1ea';
          const isSelected = selected === d.name;
          const isHovered = hovered?.name === d.name;

          return (
            <polygon
              key={d.name}
              points={d.points}
              fill={fill}
              stroke={isSelected ? '#2d2418' : isHovered ? '#4a3f36' : '#fffdf9'}
              strokeWidth={isSelected ? 3.5 : isHovered ? 2.5 : 1.2}
              filter={isSelected ? 'url(#districtLift)' : undefined}
              tabIndex={onSelect ? 0 : -1}
              role={onSelect ? 'button' : undefined}
              aria-label={
                hasData
                  ? `${d.name}: ${format(datum.value)} ${metricLabel}`
                  : `${d.name}: no data`
              }
              onMouseEnter={() => setHovered(d)}
              onFocus={() => setHovered(d)}
              onBlur={() => setHovered(null)}
              onClick={() => onSelect?.(d.name)}
              onKeyDown={(e) => {
                if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onSelect(d.name);
                }
              }}
              className={clsx(
                'transition-[fill,stroke,stroke-width,opacity] duration-200 focus:outline-none',
                onSelect && 'cursor-pointer',
                // Districts other than the hovered one recede slightly, which
                // makes the hovered shape pop without moving anything.
                hovered && !isHovered && !isSelected && 'opacity-70'
              )}
              style={{
                // Stagger the initial paint west-to-east so the state draws in.
                animation: `fade-in 240ms ease-out ${Math.min(i * 12, 400)}ms both`,
              }}
            />
          );
        })}

        {/* District labels sit above every polygon so neighbours cannot clip them. */}
        {showLabels &&
          MAHARASHTRA_GEO.map((d) => {
            const datum = data[d.name];
            const hasData = datum !== undefined && Number.isFinite(datum.value);
            const bucket = hasData ? bucketOf(datum.value) : 0;
            const isActive = hovered?.name === d.name || selected === d.name;

            return (
              <text
                key={`label-${d.name}`}
                x={d.labelX}
                y={d.labelY}
                textAnchor="middle"
                pointerEvents="none"
                className="hidden sm:block select-none"
                style={{
                  fontSize: isActive ? 15 : 13,
                  fontWeight: isActive ? 800 : 600,
                  fill: hasData ? LABEL_INK[bucket] : '#9b8874',
                  transition: 'font-size 180ms, font-weight 180ms',
                  paintOrder: 'stroke',
                  stroke: hasData && bucket >= 4 ? 'transparent' : 'rgba(255,253,249,0.75)',
                  strokeWidth: 3,
                  strokeLinejoin: 'round',
                }}
              >
                {d.short ?? d.name}
              </text>
            );
          })}
      </svg>

      {/* Hover tooltip. Positioned against the wrapper, flipped near the edges
          so it never runs off the card. */}
      {active && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-20 w-60 rounded-xl border border-line bg-surface p-3 shadow-premium animate-fade-in"
          style={{
            left: Math.min(pointer.x + 14, (wrapRef.current?.clientWidth ?? 0) - 250),
            top: Math.max(pointer.y - 12, 4),
          }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-display text-sm font-bold text-ink truncate">{active.name}</p>
            <span className="text-[10px] uppercase tracking-wider text-ink-soft shrink-0">
              {active.division}
            </span>
          </div>

          {activeDatum && Number.isFinite(activeDatum.value) ? (
            <>
              <p className="mt-1.5 text-2xl font-display font-extrabold text-ink tabular-nums leading-none">
                {format(activeDatum.value)}
              </p>
              <p className="text-[11px] text-ink-soft mt-0.5">{metricLabel}</p>

              {activeDatum.detail && activeDatum.detail.length > 0 && (
                <dl className="mt-2.5 space-y-1 border-t border-line pt-2">
                  {activeDatum.detail.map((row) => (
                    <div key={row.label} className="flex justify-between gap-2 text-[11px]">
                      <dt className="text-ink-soft truncate">{row.label}</dt>
                      <dd className="font-semibold text-ink tabular-nums shrink-0">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </>
          ) : (
            <p className="mt-1.5 text-sm text-ink-soft italic">No data reported</p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-ink-soft tabular-nums">
            {format(min)}
          </span>
          <div className="flex rounded-md overflow-hidden border border-line">
            {colors.map((c, i) => (
              <span
                key={c}
                className="h-3.5 w-7"
                style={{ backgroundColor: c }}
                title={
                  i === 0
                    ? `up to ${format(thresholds[0] ?? max)}`
                    : i === colors.length - 1
                    ? `${format(thresholds[i - 1] ?? min)} and above`
                    : `${format(thresholds[i - 1])} – ${format(thresholds[i])}`
                }
              />
            ))}
          </div>
          <span className="text-[11px] font-semibold text-ink-soft tabular-nums">
            {format(max)}
          </span>
          <span className="text-[11px] text-ink-soft ml-1">{metricLabel}</span>
        </div>

        <p className="text-[10px] text-ink-soft italic">
          Schematic district outlines — indicative positions, not survey boundaries
        </p>
      </div>
    </div>
  );
};
