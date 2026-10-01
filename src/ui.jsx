import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export function LumenuMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 16.5a8 8 0 0 1 16 0" />
      <path d="M2.5 19.5h19" />
      <path d="M12 7v1.5" />
      <circle cx="12" cy="5.6" r="1.3" />
    </svg>
  );
}

export function Brand({ to = '/', external = true }) {
  const content = (
    <>
      <span className="lx-brand__mark"><LumenuMark /></span>
      Lumenu
    </>
  );
  return external ? <a className="lx-brand" href={to}>{content}</a> : <Link className="lx-brand" to={to}>{content}</Link>;
}

/** Campo com rótulo, dica e erro. `children` é o input (recebe o id). */
export function Field({ id, label, optional, hint, error, children, className = '' }) {
  return (
    <div className={`lx-field ${className}`}>
      {label && (
        <label htmlFor={id} className="lx-label">
          {label} {optional && <span className="opt">(opcional)</span>}
        </label>
      )}
      {children}
      {error ? <span className="lx-error" role="alert">{error}</span> : hint ? <span className="lx-hint">{hint}</span> : null}
    </div>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <label className="lx-switch" title={label}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span />
    </label>
  );
}

/** Aviso flutuante. Uso: const [toast, show] = useToast(); show('Salvo!'); … {toast} */
export function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback((content, ms = 3200) => {
    clearTimeout(timer.current);
    setToast({ content, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), ms);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const node = toast ? <div key={toast.key} className="lx-toast" role="status">{toast.content}</div> : null;
  return [node, show];
}

/** QR "de mentira" para o Pix de teste (padrão fixo a partir de um texto). */
export function PseudoQr({ seed = 'lumenu', size = 25 }) {
  const path = useMemo(() => {
    let h = 2166136261;
    for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
    const finder = (x, y) => (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
    let d = '';
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!finder(x, y) && x !== 7 && y !== 7 && rnd() > 0.52) d += `M${x} ${y}h1v1h-1z`;
    const f = (x, y) => `M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5zM${x + 2} ${y + 2}h3v3h-3z`;
    return { data: d, finders: f(0, 0) + f(size - 7, 0) + f(0, size - 7) };
  }, [seed, size]);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <path fill="#1d1d1f" fillRule="evenodd" d={path.finders} />
      <path fill="#1d1d1f" d={path.data} />
    </svg>
  );
}
