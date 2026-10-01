import { useId } from 'react';
import { CELL, chairPositions } from '../../shared/floor.js';
import { UI } from '../../shared/i18n.js';

/** Rótulo de uma área: o nome personalizado ou o nome do tipo no idioma do site. */
export const areaLabel = (el, lang) => el.label || (UI[lang] ?? UI.pt).areas[el.type] || '';

/** Troca x↔y (planta "em pé" para telas estreitas). */
export const transposeFloor = (floor) => ({
  ...floor,
  width: floor.height,
  height: floor.width,
  elements: floor.elements.map((el) => ({ ...el, x: el.y, y: el.x, w: el.h, h: el.w })),
});

export function useFloorIds() {
  const base = `fp${useId().replace(/[:«»]/g, '')}`;
  return { hatch: `${base}-hatch`, selected: `${base}-sel` };
}

export function FloorDefs({ ids }) {
  return (
    <defs>
      <pattern id={ids.hatch} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="8" className="fp-hatch-line" strokeWidth="3" />
      </pattern>
      <linearGradient id={ids.selected} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" className="fp-sel-a" />
        <stop offset="1" className="fp-sel-b" />
      </linearGradient>
    </defs>
  );
}

export function AreaShape({ el, lang, ids }) {
  const x = el.x * CELL;
  const y = el.y * CELL;
  const w = el.w * CELL;
  const h = el.h * CELL;
  const label = areaLabel(el, lang);
  const thin = el.h < 1 || el.w < 1;
  // Elementos finos (entrada, janela) ganham o rótulo ao lado; se forem verticais, o texto gira junto.
  const vertical = el.w < 1 && el.h >= 1;
  const tx = vertical ? x - 8 : x + w / 2;
  const ty = el.h < 1 ? y - 8 : y + h / 2;
  const text = label && (
    <text
      x={tx}
      y={ty}
      transform={vertical ? `rotate(-90 ${tx} ${ty})` : undefined}
      className={`fp-label ${thin ? 'fp-label--small' : ''}`}
      textAnchor="middle"
      dominantBaseline="middle"
    >
      {label}
    </text>
  );

  switch (el.type) {
    case 'kitchen':
      return <g className="fp-area"><rect x={x} y={y} width={w} height={h} rx="12" className="fp-kitchen" fill={`url(#${ids.hatch})`} />{text}</g>;
    case 'stairs': {
      const steps = Math.max(3, Math.round(Math.max(el.w, el.h) * 2));
      const vertical = el.h >= el.w;
      return (
        <g className="fp-area">
          <rect x={x} y={y} width={w} height={h} rx="6" className="fp-stairs" />
          {Array.from({ length: steps - 1 }, (_, i) => {
            const d = ((i + 1) / steps) * (vertical ? h : w);
            return vertical
              ? <line key={i} x1={x + 4} x2={x + w - 4} y1={y + d} y2={y + d} className="fp-step" />
              : <line key={i} y1={y + 4} y2={y + h - 4} x1={x + d} x2={x + d} className="fp-step" />;
          })}
          {text}
        </g>
      );
    }
    case 'plant':
      return (
        <g className="fp-area">
          <circle cx={x + w / 2} cy={y + h / 2} r={Math.min(w, h) / 2} className="fp-plant" />
          <circle cx={x + w / 2} cy={y + h / 2} r={Math.min(w, h) / 4} className="fp-plant-core" />
        </g>
      );
    case 'wall':
    case 'window':
    case 'entrance':
      return <g className="fp-area"><rect x={x} y={y} width={w} height={h} rx={Math.min(w, h) / 2} className={`fp-${el.type}`} />{text}</g>;
    default:
      return <g className="fp-area"><rect x={x} y={y} width={w} height={h} rx="12" className={`fp-${el.type}`} />{text}</g>;
  }
}

export function TableShape({ table, ids }) {
  const x = table.x * CELL;
  const y = table.y * CELL;
  const w = table.w * CELL;
  const h = table.h * CELL;
  return (
    <>
      {chairPositions(table).map(([cx, cy], i) => (
        <circle key={i} cx={cx * CELL} cy={cy * CELL} r="6.5" className="fp-chair" />
      ))}
      {table.shape === 'round' ? (
        <circle cx={x + w / 2} cy={y + h / 2} r={w / 2} className="fp-top" style={{ '--sel-paint': `url(#${ids.selected})` }} />
      ) : (
        <rect x={x} y={y} width={w} height={h} rx="9" className="fp-top" style={{ '--sel-paint': `url(#${ids.selected})` }} />
      )}
      <text x={x + w / 2} y={y + h / 2} className="fp-code" textAnchor="middle" dominantBaseline="central">
        {table.label}
      </text>
    </>
  );
}

export const PAD = 16;
export const floorViewBox = (floor) => `${-PAD} ${-PAD} ${floor.width * CELL + PAD * 2} ${floor.height * CELL + PAD * 2}`;

/**
 * Planta somente leitura (site público). `stateOf(table)` → available | selected | occupied | unsuitable.
 */
export function FloorView({ floor, lang, stateOf, onSelect, ariaLabel, tableAria }) {
  const ids = useFloorIds();
  const areas = floor.elements.filter((el) => el.type !== 'table');
  const tables = floor.elements.filter((el) => el.type === 'table');

  return (
    <svg className="fp" viewBox={floorViewBox(floor)} role="group" aria-label={ariaLabel}>
      <FloorDefs ids={ids} />
      <rect x="0" y="0" width={floor.width * CELL} height={floor.height * CELL} rx="18" className="fp-room" />
      {areas.map((el) => <AreaShape key={el.id} el={el} lang={lang} ids={ids} />)}
      {tables.map((table) => {
        const state = stateOf(table);
        const interactive = state === 'available' || state === 'selected';
        const select = () => interactive && onSelect(table);
        return (
          <g
            key={table.id}
            className={`fp-table is-${state}`}
            role="button"
            tabIndex={interactive ? 0 : -1}
            aria-pressed={state === 'selected'}
            aria-disabled={!interactive}
            aria-label={tableAria?.(table, state)}
            onClick={select}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                select();
              }
            }}
          >
            <TableShape table={table} ids={ids} />
          </g>
        );
      })}
    </svg>
  );
}
