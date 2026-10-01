import { useEffect, useRef } from 'react';
import { AREA_TYPES, CELL, FLOOR_LIMITS, MAX_SEATS, TABLE_SHAPES, nextTableLabel, snap, tableSize } from '../../shared/floor.js';
import { tr } from '../../shared/i18n.js';
import { newId } from '../../shared/site.js';
import { setIn } from '../lib/paths.js';
import {
  ArrowRightIcon, CardIcon, DuplicateIcon, FlameIcon, GlassIcon, InfoIcon, LayersIcon, LayoutIcon, MinusIcon, PlusIcon,
  RotateIcon, SparkIcon, TableIcon, TrashIcon,
} from '../icons.jsx';
import { AreaShape, FloorDefs, TableShape, floorViewBox, useFloorIds } from '../site/FloorShapes.jsx';
import { Field } from '../ui.jsx';
import { useAdmin } from './AdminContext.jsx';
import { PanelHeader, Section, TField } from './fields.jsx';

const PALETTE = [
  { type: 'table', label: 'Mesa', Icon: TableIcon },
  { type: 'kitchen', label: 'Cozinha', Icon: FlameIcon },
  { type: 'bathroom', label: 'Banheiro', text: 'WC' },
  { type: 'bar', label: 'Bar', Icon: GlassIcon },
  { type: 'cashier', label: 'Caixa', Icon: CardIcon },
  { type: 'stairs', label: 'Escada', Icon: LayersIcon },
  { type: 'entrance', label: 'Entrada', Icon: ArrowRightIcon },
  { type: 'window', label: 'Janela', Icon: LayoutIcon },
  { type: 'wall', label: 'Parede', Icon: MinusIcon },
  { type: 'plant', label: 'Planta', Icon: SparkIcon },
  { type: 'zone', label: 'Área livre', Icon: LayoutIcon },
];

const clamp = (v, min, max) => Math.min(Math.max(v, min), Math.max(min, max));
const isThin = (el) => el.type !== 'table' && (el.w < 1 || el.h < 1);
const TYPING = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

/** Utilitários de edição da planta compartilhados pelo canvas e pelo painel lateral. */
function useFloorActions() {
  const { draft, change, floorId, setFloorId, selectedId, setSelectedId } = useAdmin();
  const fi = Math.max(0, draft.floors.findIndex((f) => f.id === floorId));
  const floor = draft.floors[fi];
  const selected = floor?.elements.find((el) => el.id === selectedId) ?? null;

  // `group` junta alterações seguidas (um arraste inteiro) num passo só do "desfazer".
  const setElements = (fn, group = null) => change((d) => setIn(d, ['floors', fi, 'elements'], fn(d.floors[fi].elements)), group);
  const patch = (id, values, group = null) => setElements((els) => els.map((el) => (el.id === id ? { ...el, ...values } : el)), group);

  /** Tamanho padrão de uma mesa, respeitando a escala das mesas deste andar. */
  const scaledSize = (seats, shape) => {
    const scale = floor?.tableScale ?? 1;
    const { w, h } = tableSize(seats, shape);
    const fit = (v) => Math.max(1, Math.round(v * scale * 2) / 2);
    return { w: fit(w), h: fit(h) };
  };
  const remove = (id) => {
    setElements((els) => els.filter((el) => el.id !== id));
    setSelectedId(null);
  };

  /** Primeiro espaço livre (com folga para as cadeiras), procurando a partir do centro do salão. */
  const freeSpot = (base) => {
    const gap = base.type === 'table' ? 1 : 0.5;
    const hits = (x, y) =>
      floor.elements.some((el) => {
        const m = el.type === 'table' ? 1 : 0.5;
        return x < el.x + el.w + Math.max(gap, m) && x + base.w + Math.max(gap, m) > el.x && y < el.y + el.h + Math.max(gap, m) && y + base.h + Math.max(gap, m) > el.y;
      });
    const cx = (floor.width - base.w) / 2;
    const cy = (floor.height - base.h) / 2;
    const spots = [];
    for (let y = gap; y <= floor.height - base.h - gap; y += 1) {
      for (let x = gap; x <= floor.width - base.w - gap; x += 1) spots.push([x, y, (x - cx) ** 2 + (y - cy) ** 2]);
    }
    spots.sort((a, b) => a[2] - b[2]);
    const spot = spots.find(([x, y]) => !hits(x, y));
    return spot ? { x: snap(spot[0]), y: snap(spot[1]) } : { x: snap(clamp(cx, 0, floor.width - base.w)), y: snap(clamp(cy, 0, floor.height - base.h)) };
  };

  const place = (base) => {
    const { x, y } = freeSpot(base);
    const el = { id: newId(), ...base, x, y };
    setElements((els) => [...els, el]);
    setSelectedId(el.id);
  };

  const add = (type) => {
    if (type === 'table') place({ type, label: nextTableLabel(draft), seats: 4, shape: 'square', ...scaledSize(4, 'square') });
    else place({ type, label: '', w: AREA_TYPES[type].w, h: AREA_TYPES[type].h });
  };

  const duplicate = (el) => {
    const copy = { ...el, id: newId(), x: clamp(el.x + 1, 0, floor.width - el.w), y: clamp(el.y + 1, 0, floor.height - el.h) };
    if (el.type === 'table') copy.label = nextTableLabel(draft);
    setElements((els) => [...els, copy]);
    setSelectedId(copy.id);
  };

  const rotate = (el) => {
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    patch(el.id, { w: el.h, h: el.w, x: clamp(snap(cx - el.h / 2), 0, floor.width - el.h), y: clamp(snap(cy - el.w / 2), 0, floor.height - el.w) });
  };

  const resizeTable = (el, seats, shape) => {
    let { w, h } = scaledSize(seats, shape);
    if (shape === 'rect' && el.shape === 'rect' && el.h > el.w) [w, h] = [h, w];
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    patch(el.id, { seats, shape, w, h, x: clamp(snap(cx - w / 2), 0, floor.width - w), y: clamp(snap(cy - h / 2), 0, floor.height - h) });
  };

  /** Aplica o tamanho padrão (com a escala do andar) em todas as mesas, mantendo o centro de cada uma. */
  const resizeAllTables = () =>
    setElements((els) =>
      els.map((el) => {
        if (el.type !== 'table') return el;
        let { w, h } = scaledSize(el.seats, el.shape);
        if (el.shape === 'rect' && el.h > el.w) [w, h] = [h, w];
        const cx = el.x + el.w / 2;
        const cy = el.y + el.h / 2;
        return { ...el, w, h, x: clamp(snap(cx - w / 2), 0, floor.width - w), y: clamp(snap(cy - h / 2), 0, floor.height - h) };
      }),
    );

  return { draft, fi, floor, floorId, setFloorId, selected, selectedId, setSelectedId, setElements, patch, remove, add, duplicate, rotate, resizeTable, resizeAllTables, scaledSize, change };
}

/* ---------- Canvas (área principal) ---------- */

export function FloorEditor() {
  const { editLang } = useAdmin();
  const { draft, fi, floor, setFloorId, selected, selectedId, setSelectedId, patch, remove, add, duplicate, change } = useFloorActions();
  const svgRef = useRef(null);
  const drag = useRef(null);
  const ids = useFloorIds();

  // Atalhos: Delete apaga, setas movem, Ctrl/Cmd+D duplica, Esc tira a seleção.
  useEffect(() => {
    const onKey = (e) => {
      if (!selected || TYPING(document.activeElement)) return;
      const step = e.shiftKey ? 1 : 0.5;
      const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        remove(selected.id);
      } else if (moves[e.key]) {
        e.preventDefault();
        const [dx, dy] = moves[e.key];
        patch(selected.id, { x: clamp(selected.x + dx, 0, floor.width - selected.w), y: clamp(selected.y + dy, 0, floor.height - selected.h) }, `nudge:${selected.id}`);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicate(selected);
      } else if (e.key === 'Escape') {
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!floor) return null;

  const toCell = (e) => {
    const ctm = svgRef.current.getScreenCTM();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x / CELL, y: p.y / CELL };
  };

  const startDrag = (el, mode) => (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    if (mode !== 'room') setSelectedId(el.id);
    drag.current = { id: el.id, mode, start: toCell(e), orig: el, group: `${mode}:${el.id}:${Date.now()}` };
    svgRef.current.setPointerCapture(e.pointerId);
  };

  // O salão não pode ficar menor do que o que está desenhado nele.
  const minRoom = floor.elements.reduce(
    (m, el) => ({ w: Math.max(m.w, Math.ceil(el.x + el.w)), h: Math.max(m.h, Math.ceil(el.y + el.h)) }),
    { w: FLOOR_LIMITS.min, h: FLOOR_LIMITS.min },
  );

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const p = toCell(e);
    const dx = p.x - d.start.x;
    const dy = p.y - d.start.y;
    const o = d.orig;
    if (d.mode === 'room') {
      const width = clamp(Math.round(o.width + dx), minRoom.w, FLOOR_LIMITS.max);
      const height = clamp(Math.round(o.height + dy), minRoom.h, FLOOR_LIMITS.max);
      change((doc) => setIn(doc, ['floors', fi], { ...doc.floors[fi], width, height }), d.group);
    } else if (d.mode === 'move') {
      patch(d.id, { x: clamp(snap(o.x + dx), 0, floor.width - o.w), y: clamp(snap(o.y + dy), 0, floor.height - o.h) }, d.group);
    } else {
      const values = {};
      if (!(isThin(o) && o.w < 1)) values.w = clamp(snap(o.w + dx), 1, floor.width - o.x);
      if (!(isThin(o) && o.h < 1)) values.h = clamp(snap(o.h + dy), 1, floor.height - o.y);
      // Mesa redonda continua redonda.
      if (o.type === 'table' && o.shape === 'round') values.w = values.h = clamp(snap(Math.max(o.w + dx, o.h + dy)), 1, Math.min(floor.width - o.x, floor.height - o.y));
      patch(d.id, values, d.group);
    }
  };

  const addFloor = () => {
    const n = draft.floors.length + 1;
    const id = newId();
    change((d) => ({
      ...d,
      floors: [...d.floors, { id, name: { pt: `Andar ${n}`, en: `Floor ${n}`, de: `Etage ${n}` }, width: floor.width, height: floor.height, tableScale: floor.tableScale ?? 1, elements: [] }],
    }));
    setFloorId(id);
    setSelectedId(null);
  };

  const pad = 0.6;
  const tables = floor.elements.filter((el) => el.type === 'table');
  const seats = tables.reduce((sum, t) => sum + t.seats, 0);

  return (
    <div className="adm-floor">
      <div className="adm-floor__bar">
        <div className="adm-floor__tabs" role="tablist" aria-label="Andares">
          {draft.floors.map((f, i) => (
            <button key={f.id} type="button" role="tab" aria-selected={i === fi} className={`adm-floor__tab ${i === fi ? 'is-active' : ''}`} onClick={() => { setFloorId(f.id); setSelectedId(null); }}>
              {tr(f.name, editLang, draft.defaultLanguage) || `Andar ${i + 1}`}
            </button>
          ))}
          {draft.floors.length < 10 && (
            <button type="button" className="adm-floor__tab adm-floor__tab--add" onClick={addFloor}><PlusIcon size={15} /> Andar</button>
          )}
        </div>
        <span className="adm-floor__stats">{tables.length} {tables.length === 1 ? 'mesa' : 'mesas'} · {seats} lugares</span>
      </div>

      <div className="adm-floor__palette" role="toolbar" aria-label="Adicionar à planta">
        {PALETTE.map(({ type, label, Icon, text }) => (
          <button key={type} type="button" className={`adm-tool ${type === 'table' ? 'adm-tool--primary' : ''}`} onClick={() => add(type)}>
            {Icon ? <Icon size={17} /> : <b className="adm-tool__text">{text}</b>}
            {label}
          </button>
        ))}
      </div>

      <div className="adm-floor__canvas">
        <svg
          ref={svgRef}
          className="fp fp--editor"
          viewBox={floorViewBox(floor)}
          onPointerMove={onPointerMove}
          onPointerUp={() => { drag.current = null; }}
          onPointerCancel={() => { drag.current = null; }}
          onPointerDown={() => setSelectedId(null)}
          role="application"
          aria-label="Planta do salão (arraste para mover)"
        >
          <FloorDefs ids={ids} />
          <defs>
            <pattern id={`${ids.hatch}-grid`} width={CELL} height={CELL} patternUnits="userSpaceOnUse">
              <path d={`M ${CELL} 0 L 0 0 0 ${CELL}`} className="fp-grid" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={floor.width * CELL} height={floor.height * CELL} rx="14" className="fp-room" />
          <rect x="0" y="0" width={floor.width * CELL} height={floor.height * CELL} rx="14" fill={`url(#${ids.hatch}-grid)`} pointerEvents="none" />

          {floor.elements.filter((el) => el.type !== 'table').map((el) => (
            <g key={el.id} className={`fp-item ${el.id === selectedId ? 'is-picked' : ''}`} onPointerDown={startDrag(el, 'move')}>
              <AreaShape el={el} lang={editLang} ids={ids} />
              <rect x={el.x * CELL} y={el.y * CELL} width={el.w * CELL} height={el.h * CELL} className="fp-hit" />
            </g>
          ))}
          {tables.map((el) => (
            <g key={el.id} className={`fp-item fp-table is-editor ${el.id === selectedId ? 'is-picked' : ''}`} onPointerDown={startDrag(el, 'move')}>
              <TableShape table={el} ids={ids} />
              <rect x={(el.x - pad) * CELL} y={(el.y - pad) * CELL} width={(el.w + pad * 2) * CELL} height={(el.h + pad * 2) * CELL} className="fp-hit" />
            </g>
          ))}

          {selected && (
            <g className="fp-selection" pointerEvents="none">
              <rect
                x={(selected.x - (selected.type === 'table' ? pad : 0.15)) * CELL}
                y={(selected.y - (selected.type === 'table' ? pad : 0.15)) * CELL}
                width={(selected.w + (selected.type === 'table' ? pad * 2 : 0.3)) * CELL}
                height={(selected.h + (selected.type === 'table' ? pad * 2 : 0.3)) * CELL}
                rx="8"
              />
            </g>
          )}
          <rect
            className="fp-handle fp-handle--room"
            x={floor.width * CELL - 9}
            y={floor.height * CELL - 9}
            width="18"
            height="18"
            rx="5"
            onPointerDown={startDrag({ id: 'room', width: floor.width, height: floor.height }, 'room')}
          >
            <title>Arraste para mudar o tamanho do salão</title>
          </rect>
          {selected && (
            <rect
              className="fp-handle"
              x={(selected.x + selected.w) * CELL - 6}
              y={(selected.y + selected.h) * CELL - 6}
              width="12"
              height="12"
              rx="3"
              onPointerDown={startDrag(selected, 'resize')}
            />
          )}
        </svg>
        {floor.elements.every((el) => el.type !== 'table') && (
          <div className="adm-floor__empty">
            <TableIcon size={22} />
            <strong>Comece adicionando as mesas</strong>
            <span>Clique em “Mesa” acima e arraste para a posição certa. Depois marque cozinha, banheiro, bar e entrada.</span>
          </div>
        )}
      </div>
      <p className="adm-floor__help">
        <InfoIcon size={15} /> Arraste para mover · alça azul redimensiona o item · canto do salão muda o tamanho do salão · setas ajustam · Delete apaga · Ctrl+D duplica
      </p>
    </div>
  );
}

/* ---------- Painel lateral da planta ---------- */

const NumberField = ({ id, label, value, min, max, step = 1, onChange }) => (
  <Field id={id} label={label}>
    <input
      id={id}
      type="number"
      className="lx-input lx-input--sm"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (Number.isFinite(n) && e.target.value !== '') onChange(clamp(n, min, max));
      }}
    />
  </Field>
);

export function FloorPanel() {
  const { update } = useAdmin();
  const { draft, fi, floor, setFloorId, selected, patch, remove, duplicate, rotate, resizeTable, resizeAllTables, scaledSize, change, setSelectedId } = useFloorActions();
  if (!floor) return null;
  const scale = Math.round((floor.tableScale ?? 1) * 100);

  const removeFloor = () => {
    if (!window.confirm('Excluir este andar e tudo o que está desenhado nele?')) return;
    const next = draft.floors.filter((f) => f.id !== floor.id);
    change((d) => ({ ...d, floors: d.floors.filter((f) => f.id !== floor.id) }));
    setFloorId(next[0]?.id);
    setSelectedId(null);
  };

  const totalTables = draft.floors.reduce((n, f) => n + f.elements.filter((el) => el.type === 'table').length, 0);

  return (
    <>
      <PanelHeader
        title="Planta do salão"
        description="Obrigatória para publicar: desenhe as mesas como estão no seu salão. Seus clientes escolhem a mesa por este mapa na hora de reservar."
      />
      {totalTables === 0 && (
        <div className="lx-alert lx-alert--warning">
          <InfoIcon size={18} />
          <span>Adicione pelo menos uma mesa para liberar a publicação do site.</span>
        </div>
      )}

      {selected ? (
        <Section
          title={selected.type === 'table' ? `Mesa ${selected.label}` : AREA_TYPES[selected.type].label}
          aside={<button type="button" className="lx-btn lx-btn--plain lx-btn--sm" onClick={() => setSelectedId(null)}>Fechar</button>}
        >
          {selected.type === 'table' ? (
            <>
              <Field id="fp-label" label="Nome da mesa" hint="Aparece no mapa e na reserva. Ex.: M1, Varanda 2">
                <input id="fp-label" className="lx-input" maxLength={8} value={selected.label} onChange={(e) => patch(selected.id, { label: e.target.value })} />
              </Field>
              <div className="lx-field">
                <span className="lx-label">Lugares</span>
                <div className="adm-stepper">
                  <button type="button" className="lx-btn lx-btn--secondary lx-btn--icon" disabled={selected.seats <= 1} onClick={() => resizeTable(selected, selected.seats - 1, selected.shape)} aria-label="Menos lugares"><MinusIcon size={16} /></button>
                  <strong>{selected.seats}</strong>
                  <button type="button" className="lx-btn lx-btn--secondary lx-btn--icon" disabled={selected.seats >= MAX_SEATS} onClick={() => resizeTable(selected, selected.seats + 1, selected.shape)} aria-label="Mais lugares"><PlusIcon size={16} /></button>
                </div>
              </div>
              <div className="lx-field">
                <span className="lx-label">Formato</span>
                <div className="lx-seg">
                  {Object.entries(TABLE_SHAPES).map(([shape, label]) => (
                    <button key={shape} type="button" aria-pressed={selected.shape === shape} onClick={() => resizeTable(selected, selected.seats, shape)}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="lx-row">
                <NumberField id="fp-tw" label="Largura" value={selected.w} min={1} max={Math.min(30, floor.width - selected.x)} step={0.5} onChange={(w) => patch(selected.id, { w, ...(selected.shape === 'round' ? { h: w } : {}) })} />
                <NumberField id="fp-th" label="Altura" value={selected.h} min={1} max={Math.min(30, floor.height - selected.y)} step={0.5} onChange={(h) => patch(selected.id, { h, ...(selected.shape === 'round' ? { w: h } : {}) })} />
              </div>
              {(() => {
                const auto = scaledSize(selected.seats, selected.shape);
                const isAuto = (selected.w === auto.w && selected.h === auto.h) || (selected.w === auto.h && selected.h === auto.w);
                return !isAuto && (
                  <button type="button" className="lx-btn lx-btn--plain lx-btn--sm" onClick={() => resizeTable(selected, selected.seats, selected.shape)}>Voltar ao tamanho padrão</button>
                );
              })()}
            </>
          ) : (
            <>
              <Field id="fp-area-label" label="Nome no mapa" optional hint="Deixe vazio para usar o nome padrão traduzido.">
                <input id="fp-area-label" className="lx-input" maxLength={30} placeholder={AREA_TYPES[selected.type].label} value={selected.label} onChange={(e) => patch(selected.id, { label: e.target.value })} />
              </Field>
              <div className="lx-row">
                <NumberField id="fp-w" label="Largura" value={selected.w} min={isThin(selected) && selected.w < 1 ? 0.2 : 0.5} max={floor.width - selected.x} step={0.5} onChange={(w) => patch(selected.id, { w })} />
                <NumberField id="fp-h" label="Altura" value={selected.h} min={isThin(selected) && selected.h < 1 ? 0.2 : 0.5} max={floor.height - selected.y} step={0.5} onChange={(h) => patch(selected.id, { h })} />
              </div>
            </>
          )}
          <div className="adm-actions">
            {(selected.type !== 'table' || selected.shape === 'rect') && (
              <button type="button" className="lx-btn lx-btn--secondary lx-btn--sm" onClick={() => rotate(selected)}><RotateIcon size={15} /> Girar</button>
            )}
            <button type="button" className="lx-btn lx-btn--secondary lx-btn--sm" onClick={() => duplicate(selected)}><DuplicateIcon size={15} /> Duplicar</button>
            <button type="button" className="lx-btn lx-btn--danger lx-btn--sm" onClick={() => remove(selected.id)}><TrashIcon size={15} /> Excluir</button>
          </div>
        </Section>
      ) : (
        <Section>
          <p className="lx-hint" style={{ margin: 0 }}>Clique em um item da planta para editar lugares, formato, nome e tamanho.</p>
        </Section>
      )}

      <Section title="Andar">
        <TField path={['floors', fi, 'name']} label="Nome do andar" max={40} />
        <div className="lx-row">
          <NumberField id="fp-fw" label="Largura do salão" value={floor.width} min={FLOOR_LIMITS.min} max={FLOOR_LIMITS.max} onChange={(v) => update(['floors', fi, 'width'], v)} />
          <NumberField id="fp-fh" label="Profundidade" value={floor.height} min={FLOOR_LIMITS.min} max={FLOOR_LIMITS.max} onChange={(v) => update(['floors', fi, 'height'], v)} />
        </div>
        <p className="lx-hint" style={{ margin: 0 }}>Medidas em quadradinhos da grade (até {FLOOR_LIMITS.max} × {FLOOR_LIMITS.max}). Você também pode arrastar o canto do salão na planta.</p>
        <div className="lx-field">
          <span className="lx-label adm-label-row"><span>Tamanho das mesas</span><span className="adm-muted-text">{scale}%</span></span>
          <input type="range" min={40} max={200} step={10} value={scale} onChange={(e) => update(['floors', fi, 'tableScale'], Number(e.target.value) / 100)} aria-label="Tamanho das mesas" />
          <span className="lx-hint">Para salões grandes, diminua para caber mais mesas. Vale para as mesas novas deste andar.</span>
        </div>
        <button type="button" className="lx-btn lx-btn--secondary lx-btn--sm" onClick={() => window.confirm('Aplicar o tamanho padrão em todas as mesas deste andar? Tamanhos ajustados à mão serão substituídos.') && resizeAllTables()}>
          Aplicar em todas as mesas deste andar
        </button>
        {draft.floors.length > 1 && (
          <button type="button" className="lx-btn lx-btn--danger lx-btn--sm" onClick={removeFloor}><TrashIcon size={15} /> Excluir este andar</button>
        )}
      </Section>
    </>
  );
}
