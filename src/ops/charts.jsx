import { useLayoutEffect, useRef, useState } from 'react';

// Gráficos do dashboard (SVG). Paleta validada para daltonismo no fundo branco:
// série 1 azul, série 2 laranja; positivo/negativo = azul/vermelho. Texto nunca usa a cor da série.
export const COLORS = { blue: '#2a78d6', orange: '#eb6834', red: '#e34948', grid: '#ebedf0', axis: '#6e6e73' };

function useWidth(initial = 600) {
  const ref = useRef(null);
  const [width, setWidth] = useState(initial);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

function niceStep(range, count) {
  const raw = range / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
}

function niceScale(min, max, count = 4) {
  if (min === 0 && max === 0) max = 100_00;
  const step = niceStep(max - min || Math.abs(max), count);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v));
  return { lo, hi, ticks };
}

/** Coluna com a ponta arredondada (4px) e a base reta, crescendo para cima ou para baixo do zero. */
function columnPath(x, w, y0, y1) {
  const h = Math.abs(y1 - y0);
  const r = Math.min(4, h, w / 2);
  if (h < 0.5) return '';
  if (y1 < y0) return `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 + r}V${y0}Z`;
  return `M${x},${y0}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 - r}V${y0}Z`;
}

export function Legend({ items }) {
  return (
    <ul className="ops-legend-list">
      {items.map((i) => (
        <li key={i.name}><span className="ops-legend-list__key" style={{ background: i.color }} />{i.name}</li>
      ))}
    </ul>
  );
}

/**
 * Colunas (agrupadas quando há mais de uma série). Passar o mouse ou o foco numa coluna
 * mostra todas as séries daquele ponto.
 * categories: [{ key, label, title }]; series: [{ name, color, values, colorFor? }]
 */
export function ColumnChart({ categories, series, format, formatAxis = format, height = 230, labelEvery = 1, ariaLabel }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const padL = 64;
  const padR = 8;
  const padT = 14;
  const padB = 26;
  const innerW = Math.max(10, width - padL - padR);
  const innerH = height - padT - padB;
  const values = series.flatMap((s) => s.values);
  const { lo, hi, ticks } = niceScale(Math.min(0, ...values), Math.max(0, ...values));
  const y = (v) => padT + ((hi - v) / (hi - lo)) * innerH;
  const band = innerW / categories.length;
  const gap = 2;
  const barW = Math.max(3, Math.min(24, (band * 0.72 - gap * (series.length - 1)) / series.length));
  const groupW = barW * series.length + gap * (series.length - 1);
  const zero = y(0);

  return (
    <div className="ops-chart" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#c7cbd1' : COLORS.grid} strokeWidth="1" />
            <text x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end" className="ops-chart__tick">{formatAxis(t)}</text>
          </g>
        ))}
        {categories.map((c, i) => {
          const x0 = padL + band * i + (band - groupW) / 2;
          const active = hover === i;
          return (
            <g key={c.key}>
              {series.map((s, si) => {
                const v = s.values[i] ?? 0;
                return (
                  <path
                    key={s.name}
                    d={columnPath(x0 + si * (barW + gap), barW, zero, y(v))}
                    fill={s.colorFor ? s.colorFor(v) : s.color}
                    opacity={hover === null || active ? 1 : 0.45}
                  />
                );
              })}
              {(i % labelEvery === 0 || i === categories.length - 1) && (
                <text x={padL + band * i + band / 2} y={height - 8} textAnchor="middle" className="ops-chart__tick">{c.label}</text>
              )}
              <rect
                x={padL + band * i}
                y={padT}
                width={band}
                height={innerH}
                fill="transparent"
                tabIndex={0}
                aria-label={`${c.title ?? c.label}: ${series.map((s) => `${s.name} ${format(s.values[i] ?? 0)}`).join(', ')}`}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              />
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="ops-tip"
          style={{
            left: Math.min(width - 150, Math.max(0, padL + band * hover + band / 2 - 75)),
            top: Math.max(0, Math.min(...series.map((s) => y(Math.max(0, s.values[hover] ?? 0)))) - 12),
          }}
          role="presentation"
        >
          <span className="ops-tip__title">{categories[hover].title ?? categories[hover].label}</span>
          {series.map((s) => {
            const v = s.values[hover] ?? 0;
            return (
              <span key={s.name} className="ops-tip__row">
                <i style={{ background: s.colorFor ? s.colorFor(v) : s.color }} />
                <strong>{format(v)}</strong> {s.name}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Barras horizontais com o valor na ponta (ranking: categorias de despesa, mais vendidos). */
export function BarList({ items, format, color = COLORS.blue, empty = 'Sem dados no período.' }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="lx-hint" style={{ margin: 0 }}>{empty}</p>;
  return (
    <ul className="ops-barlist">
      {items.map((i) => (
        <li key={i.key ?? i.label} title={`${i.label}: ${format(i.value)}`}>
          <span className="ops-barlist__label">{i.label}{i.sub && <small>{i.sub}</small>}</span>
          <span className="ops-barlist__track"><span style={{ width: `${(i.value / max) * 100}%`, background: color }} /></span>
          <strong className="ops-barlist__value">{format(i.value)}</strong>
        </li>
      ))}
    </ul>
  );
}

/** Uma barra dividida em partes (ex.: salão × delivery), com legenda e percentuais. */
export function SplitBar({ parts, format }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div className="ops-split">
      <div className="ops-split__bar" role="img" aria-label={parts.map((p) => `${p.label} ${format(p.value)}`).join(', ')}>
        {total > 0 ? (
          parts.filter((p) => p.value > 0).map((p) => <span key={p.label} style={{ flexGrow: p.value, background: p.color }} title={`${p.label}: ${format(p.value)}`} />)
        ) : (
          <span className="is-empty" />
        )}
      </div>
      <ul className="ops-legend-list ops-legend-list--values">
        {parts.map((p) => (
          <li key={p.label}>
            <span className="ops-legend-list__key" style={{ background: p.color }} />
            {p.label}
            <strong>{format(p.value)}</strong>
            <small>{total ? `${Math.round((p.value / total) * 100)}%` : '—'}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
