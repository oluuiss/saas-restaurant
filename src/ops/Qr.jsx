import { useEffect, useMemo, useRef, useState } from 'react';
import qrcode from 'qrcode-generator';
import { findTable, tableFromQr } from '../../shared/floor.js';
import { AlertIcon, CameraIcon, CloseIcon } from '../icons.jsx';

/** QR Code de verdade (SVG), com margem branca para a câmera achar. */
export function QrCode({ value, size = 160, label }) {
  const { path, n } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { path: d, n: count };
  }, [value]);
  return (
    <svg viewBox={`-3 -3 ${n + 6} ${n + 6}`} width={size} height={size} role="img" aria-label={label ?? value} shapeRendering="crispEdges">
      <rect x="-3" y="-3" width={n + 6} height={n + 6} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}

/** Lê QR Codes pela câmera: BarcodeDetector quando o navegador tem, senão jsQR. */
function useQrCamera(videoRef, active, onCode) {
  const [state, setState] = useState('starting');
  const handler = useRef(onCode);
  handler.current = onCode;

  useEffect(() => {
    if (!active) return undefined;
    let stream;
    let stopped = false;
    let timer;
    const canvas = document.createElement('canvas');

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState('unsupported');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      } catch {
        if (!stopped) setState('denied');
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play().catch(() => {});
      setState('scanning');

      let detector = null;
      if ('BarcodeDetector' in window) {
        try {
          const formats = await window.BarcodeDetector.getSupportedFormats();
          if (formats.includes('qr_code')) detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        } catch {
          detector = null;
        }
      }
      const jsQR = detector ? null : (await import('jsqr')).default;

      const tick = async () => {
        if (stopped) return;
        try {
          if (video.readyState >= 2) {
            let text = null;
            if (detector) {
              const codes = await detector.detect(video);
              text = codes[0]?.rawValue ?? null;
            } else {
              const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
              canvas.width = Math.round(video.videoWidth * scale);
              canvas.height = Math.round(video.videoHeight * scale);
              const g = canvas.getContext('2d', { willReadFrequently: true });
              g.drawImage(video, 0, 0, canvas.width, canvas.height);
              const img = g.getImageData(0, 0, canvas.width, canvas.height);
              text = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })?.data ?? null;
            }
            if (text && handler.current(text) === true) return; // leu algo válido: para
          }
        } catch {
          /* quadro ruim: tenta o próximo */
        }
        timer = setTimeout(tick, 180);
      };
      tick();
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active, videoRef]);

  return state;
}

/**
 * Janela de leitura do QR Code da mesa. Também aceita digitar o número (sem câmera, câmera negada…).
 * onTable(table) recebe a mesa do restaurante.
 */
export function TableScanner({ title, hint, slug, tables, onTable, onClose }) {
  const video = useRef(null);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const site = useMemo(() => ({ floors: [{ id: 'all', elements: tables.map((t) => ({ ...t, type: 'table' })) }] }), [tables]);

  const resolve = (text, fromCamera) => {
    const label = tableFromQr(text, slug);
    const table = label ? findTable(site, label) : null;
    if (!table) {
      setError(fromCamera ? 'Esse QR Code não é de uma mesa deste restaurante.' : 'Mesa não encontrada. Confira o número.');
      return false;
    }
    const full = tables.find((t) => t.id === table.id);
    navigator.vibrate?.(60);
    onTable(full);
    return true;
  };
  const state = useQrCamera(video, true, (text) => resolve(text, true));

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="ops-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="ops-sheet__card ops-scan" onClick={(e) => e.stopPropagation()}>
        <header className="ops-sheet__head">
          <div>
            <h2>{title}</h2>
            {hint && <p>{hint}</p>}
          </div>
          <button type="button" className="ops-sheet__close" onClick={onClose} aria-label="Fechar"><CloseIcon size={18} /></button>
        </header>

        <div className={`ops-scan__view is-${state}`}>
          <video ref={video} playsInline muted />
          {state === 'scanning' && <span className="ops-scan__frame" aria-hidden="true" />}
          {state === 'starting' && <span className="ops-scan__msg"><CameraIcon size={22} /> Abrindo a câmera…</span>}
          {state === 'denied' && <span className="ops-scan__msg"><AlertIcon size={22} /> Sem acesso à câmera. Libere a câmera no navegador ou digite o número da mesa.</span>}
          {state === 'unsupported' && <span className="ops-scan__msg"><AlertIcon size={22} /> Este aparelho não abre a câmera aqui. Digite o número da mesa.</span>}
        </div>
        {state === 'scanning' && <p className="ops-scan__tip">Aponte para o QR Code da plaquinha da mesa.</p>}

        <form
          className="ops-scan__manual"
          onSubmit={(e) => {
            e.preventDefault();
            resolve(typed, false);
          }}
        >
          <input className="lx-input" value={typed} onChange={(e) => { setTyped(e.target.value); setError(''); }} placeholder="Ou digite o número da mesa (ex.: 12)" inputMode="text" aria-label="Número da mesa" />
          <button type="submit" className="lx-btn lx-btn--primary" disabled={!typed.trim()}>Abrir</button>
        </form>
        {error && <div className="lx-alert lx-alert--error" role="alert"><AlertIcon size={18} />{error}</div>}
        {tables.length > 0 && tables.length <= 40 && (
          <div className="ops-scan__chips" aria-label="Mesas">
            {tables.map((t) => (
              <button key={t.id} type="button" className="ops-chip" onClick={() => onTable(t)}>{t.label}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
