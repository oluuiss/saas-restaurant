import { useLayoutEffect, useRef, useState } from 'react';
import { MinusIcon, PlusIcon, RotateIcon, TypeIcon } from '../icons.jsx';
import { useAdmin } from './AdminContext.jsx';

const MODES = [
  { id: '', label: 'Padrão' },
  { id: 'solid', label: 'Cor' },
  { id: 'gradient', label: 'Gradiente' },
  { id: 'animated', label: 'Animado' },
];
const SIZES = { min: 40, max: 300, step: 10 };

const toHex = (rgb) => {
  const m = String(rgb).match(/\d+/g);
  if (!m || m.length < 3) return '#ffffff';
  return `#${m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
};

/**
 * Barra que aparece sobre o texto clicado na prévia: muda a cor (sólida, gradiente ou gradiente
 * que se move de um lado ao outro) e o tamanho daquele texto específico.
 */
export default function TextStyleBar() {
  const { activeText, draft, change } = useAdmin();
  const bar = useRef(null);
  const [pos, setPos] = useState(null);
  const { key, el } = activeText;
  const style = draft.textStyles?.[key] ?? {};
  const size = style.size ?? 100;

  // Acompanha o texto enquanto a prévia rola.
  useLayoutEffect(() => {
    let frame;
    const tick = () => {
      if (el?.isConnected) {
        const r = el.getBoundingClientRect();
        const h = bar.current?.offsetHeight ?? 52;
        const w = bar.current?.offsetWidth ?? 420;
        const above = r.top - h - 10;
        const top = above > 70 ? above : r.bottom + 10;
        const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
        setPos((p) => (p && p.top === top && p.left === left ? p : { top, left }));
      } else {
        setPos(null);
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [el]);

  const setStyle = (patch) =>
    change((d) => {
      const next = { ...d.textStyles?.[key], ...patch };
      Object.keys(next).forEach((k) => (next[k] === undefined || next[k] === '') && delete next[k]);
      if (next.size === 100) delete next.size;
      const textStyles = { ...d.textStyles };
      if (Object.keys(next).length) textStyles[key] = next;
      else delete textStyles[key];
      return { ...d, textStyles };
    }, `style:${key}`);

  const pickMode = (mode) => {
    if (!mode) return setStyle({ mode: undefined, color: undefined, color2: undefined });
    const base = style.color ?? toHex(getComputedStyle(el).color);
    return setStyle({ mode, color: base, color2: mode === 'solid' ? undefined : style.color2 ?? '#ffc861' });
  };
  const resize = (value) => setStyle({ size: Math.min(SIZES.max, Math.max(SIZES.min, Math.round(value / SIZES.step) * SIZES.step)) });
  const keepFocus = (e) => e.preventDefault();

  if (!pos) return null;
  const mode = style.mode ?? '';

  return (
    <div ref={bar} className="adm-style" style={{ top: pos.top, left: pos.left }} role="toolbar" aria-label="Estilo do texto">
      <span className="adm-style__icon" title="Estilo deste texto"><TypeIcon size={15} /></span>
      <div className="adm-style__seg">
        {MODES.map((m) => (
          <button key={m.id} type="button" aria-pressed={mode === m.id} onMouseDown={keepFocus} onClick={() => pickMode(m.id)}>{m.label}</button>
        ))}
      </div>
      {mode && (
        <span className="adm-style__colors">
          <label className="adm-style__color" title={mode === 'solid' ? 'Cor' : 'Cor inicial'}>
            <input type="color" value={style.color ?? '#ffffff'} onChange={(e) => setStyle({ color: e.target.value })} />
            <span style={{ background: style.color }} />
          </label>
          {mode !== 'solid' && (
            <label className="adm-style__color" title="Cor final">
              <input type="color" value={style.color2 ?? '#ffc861'} onChange={(e) => setStyle({ color2: e.target.value })} />
              <span style={{ background: style.color2 }} />
            </label>
          )}
        </span>
      )}
      <span className="adm-style__sep" />
      <div className="adm-style__size" title="Tamanho do texto">
        <button type="button" onMouseDown={keepFocus} onClick={() => resize(size - SIZES.step)} disabled={size <= SIZES.min} aria-label="Diminuir texto"><MinusIcon size={14} /></button>
        <input type="range" min={SIZES.min} max={SIZES.max} step={SIZES.step} value={size} onChange={(e) => resize(Number(e.target.value))} aria-label="Tamanho do texto" />
        <button type="button" onMouseDown={keepFocus} onClick={() => resize(size + SIZES.step)} disabled={size >= SIZES.max} aria-label="Aumentar texto"><PlusIcon size={14} /></button>
        <span className="adm-style__value">{size}%</span>
      </div>
      {(style.mode || style.size) && (
        <button type="button" className="adm-style__reset" onMouseDown={keepFocus} onClick={() => setStyle({ mode: undefined, color: undefined, color2: undefined, size: 100 })} title="Voltar ao padrão">
          <RotateIcon size={14} />
        </button>
      )}
    </div>
  );
}
