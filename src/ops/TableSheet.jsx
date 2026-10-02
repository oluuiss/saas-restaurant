import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import {
  AlertIcon, BagIcon, CalendarIcon, CheckIcon, CloseIcon, MinusIcon, PlusIcon, ReceiptIcon, SearchIcon, UsersIcon,
} from '../icons.jsx';
import { Switch } from '../ui.jsx';
import { BRL, since, useOps } from './OpsContext.jsx';

const PAYMENTS = [
  ['credit', 'Crédito'],
  ['debit', 'Débito'],
  ['pix', 'Pix'],
  ['cash', 'Dinheiro'],
  ['other', 'Outro'],
];

const ORDER_STATUS = {
  received: ['Na fila', 'warning'],
  preparing: ['Em preparo', 'info'],
  ready: ['Pronto', 'info'],
  delivered: ['Servido', 'success'],
  canceled: ['Cancelado', 'danger'],
};

export function Stepper({ value, onChange, min = 0, max = 99, label }) {
  return (
    <div className="ops-stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Menos"><MinusIcon size={16} /></button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Mais"><PlusIcon size={16} /></button>
    </div>
  );
}

/** Escolher pratos para lançar na mesa. */
function ItemPicker({ onSend, onBack, sending }) {
  const { context } = useOps();
  const [cart, setCart] = useState({});
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState('');
  const items = context.menu.items.filter((i) => !i.hidden);
  const q = query.trim().toLowerCase();
  const shown = items.filter((i) => (category === 'all' || i.categoryId === category) && (!q || i.name.toLowerCase().includes(q)));
  const lines = Object.entries(cart).filter(([, qty]) => qty > 0);
  const count = lines.reduce((s, [, qty]) => s + qty, 0);
  const total = lines.reduce((s, [id, qty]) => s + (items.find((i) => i.id === id)?.price ?? 0) * qty, 0);
  const set = (id, qty) => setCart((c) => ({ ...c, [id]: qty }));

  return (
    <>
      <div className="ops-picker__filters">
        <label className="ops-search">
          <SearchIcon size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar prato" aria-label="Buscar prato" />
        </label>
        <div className="ops-chips">
          <button type="button" className="ops-chip" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>Todos</button>
          {context.menu.categories.map((c) => (
            <button key={c.id} type="button" className="ops-chip" aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>{c.name}</button>
          ))}
        </div>
      </div>
      <ul className="ops-picker">
        {shown.map((i) => (
          <li key={i.id} className={i.soldOut ? 'is-soldout' : ''}>
            <span className="ops-picker__name">
              <strong>{i.name}</strong>
              <small>{i.soldOut ? 'Esgotado' : BRL(i.price)}</small>
            </span>
            {!i.soldOut && (cart[i.id] ? (
              <Stepper value={cart[i.id]} onChange={(v) => set(i.id, v)} max={50} label={`Quantidade de ${i.name}`} />
            ) : (
              <button type="button" className="lx-btn lx-btn--secondary lx-btn--sm" onClick={() => set(i.id, 1)}><PlusIcon size={14} /> Adicionar</button>
            ))}
          </li>
        ))}
        {!shown.length && <li className="ops-picker__empty">Nenhum prato encontrado.</li>}
      </ul>
      <div className="ops-sheet__foot">
        <input className="lx-input" value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} placeholder="Observação para a cozinha (opcional)" aria-label="Observação" />
        <div className="ops-sheet__actions">
          <button type="button" className="lx-btn lx-btn--ghost" onClick={onBack}>Voltar</button>
          <button
            type="button"
            className="lx-btn lx-btn--primary"
            disabled={!count || sending}
            onClick={() => onSend(lines.map(([itemId, qty]) => ({ itemId, qty })), notes)}
          >
            {sending ? <span className="lx-spinner" aria-label="Enviando" /> : count ? `Enviar ${count} ${count === 1 ? 'item' : 'itens'} · ${BRL(total)}` : 'Escolha os pratos'}
          </button>
        </div>
        <p className="lx-hint" style={{ margin: 0 }}>Promoções automáticas do cardápio são aplicadas ao enviar.</p>
      </div>
    </>
  );
}

/** Conta da mesa: itens, taxa de serviço, divisão e forma de pagamento (cobrança na maquininha). */
function Checkout({ data, onClose, onBack, onDone }) {
  const { showToast } = useOps();
  const [includeService, setIncludeService] = useState(true);
  const [split, setSplit] = useState(Math.max(1, data.session.people || 1));
  const [method, setMethod] = useState('credit');
  const [closing, setClosing] = useState(false);
  const b = data.bill;
  const service = includeService ? b.service : 0;
  const total = b.subtotal + service;

  const close = async () => {
    if (closing) return;
    setClosing(true);
    try {
      const result = await api.post(`ops/sessions/${data.session.id}/close`, { includeService, paymentMethod: method });
      onDone(result);
    } catch (err) {
      showToast(err.message);
      setClosing(false);
    }
  };

  return (
    <>
      <div className="ops-bill">
        {b.items.length ? (
          <ul className="ops-bill__items">
            {b.items.map((i) => (
              <li key={`${i.itemId}:${i.unit}`}><span>{i.qty}×</span> {i.name} <em>{BRL(i.total)}</em></li>
            ))}
          </ul>
        ) : (
          <p className="lx-hint">Nenhum pedido lançado nesta mesa.</p>
        )}
        <dl className="ops-bill__totals">
          <div><dt>Subtotal</dt><dd>{BRL(b.subtotal)}</dd></div>
          <div className="ops-bill__service">
            <dt>
              <Switch checked={includeService} onChange={setIncludeService} label="Incluir taxa de serviço" />
              Taxa de serviço ({b.serviceFee}%)
            </dt>
            <dd>{includeService ? BRL(service) : '—'}</dd>
          </div>
          <div className="ops-bill__total"><dt>Total</dt><dd>{BRL(total)}</dd></div>
        </dl>
        <div className="ops-bill__split">
          <span><UsersIcon size={15} /> Dividir por</span>
          <Stepper value={split} onChange={setSplit} min={1} max={30} label="Dividir a conta por" />
          <strong>{BRL(Math.ceil(total / split))} cada</strong>
        </div>
      </div>

      <div className="ops-sheet__foot">
        <span className="lx-label">Como o cliente pagou</span>
        <div className="ops-chips">
          {PAYMENTS.map(([id, label]) => (
            <button key={id} type="button" className="ops-chip" aria-pressed={method === id} onClick={() => setMethod(id)}>{label}</button>
          ))}
        </div>
        <p className="lx-hint" style={{ margin: 0 }}>Cobre {BRL(total)} na maquininha do restaurante e confirme aqui para liberar a mesa.</p>
        <div className="ops-sheet__actions">
          <button type="button" className="lx-btn lx-btn--ghost" onClick={onBack ?? onClose}>Voltar</button>
          <button type="button" className="lx-btn lx-btn--primary" onClick={close} disabled={closing}>
            {closing ? <span className="lx-spinner" aria-label="Fechando" /> : <><CheckIcon size={16} /> Pago · liberar mesa</>}
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * Janela de uma mesa. Livre: ocupar (com número de pessoas e, se houver, a reserva de hoje).
 * Ocupada: pessoas, pedidos, lançar pedido e fechar a conta.
 */
export default function TableSheet({ table, sessionId, reservation, initialMode, onClose, onChanged }) {
  const { can, showToast } = useOps();
  const [mode, setMode] = useState(initialMode ?? (sessionId ? 'details' : 'open'));
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [people, setPeople] = useState(reservation?.people ?? Math.min(2, table.seats || 2));
  const [useReservation, setUseReservation] = useState(Boolean(reservation));
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState(null);
  const peopleTimer = useRef(null);
  const sending = useRef(false); // dois toques rápidos não lançam o pedido duas vezes
  const id = data?.session.id ?? sessionId;

  useEffect(() => {
    if (!sessionId) return;
    api
      .get(`ops/sessions/${sessionId}`)
      .then((d) => {
        setData(d);
        setPeople(d.session.people);
      })
      .catch((err) => setLoadError(err.message));
  }, [sessionId]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const open = async () => {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    try {
      const d = await api.post('ops/tables/open', { tableId: table.id, people, reservationId: useReservation ? reservation?.id : undefined });
      setData(d);
      setMode('details');
      showToast(`Mesa ${table.label} ocupada · ${people} ${people === 1 ? 'pessoa' : 'pessoas'}`);
      onChanged();
    } catch (err) {
      showToast(err.message);
      if (err.data?.sessionId) {
        const d = await api.get(`ops/sessions/${err.data.sessionId}`).catch(() => null);
        if (d) {
          setData(d);
          setMode('details');
        }
      }
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };

  const changePeople = (value) => {
    setPeople(value);
    clearTimeout(peopleTimer.current);
    peopleTimer.current = setTimeout(() => {
      api.put(`ops/sessions/${id}`, { people: value }).then((d) => { setData(d); onChanged(); }).catch((err) => showToast(err.message));
    }, 500);
  };
  useEffect(() => () => clearTimeout(peopleTimer.current), []);

  const sendOrder = async (lines, notes) => {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    try {
      const d = await api.post(`ops/sessions/${id}/orders`, { lines, notes });
      setData(d);
      setMode('details');
      showToast('Pedido enviado para a cozinha.');
      onChanged();
    } catch (err) {
      showToast(err.message);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };

  const release = async () => {
    if (!window.confirm(`Liberar a mesa ${table.label}? Use só se ela foi ocupada por engano.`)) return;
    try {
      await api.post(`ops/sessions/${id}/release`);
      showToast(`Mesa ${table.label} liberada.`);
      onChanged();
      onClose();
    } catch (err) {
      showToast(err.message);
    }
  };

  const titles = {
    open: `Ocupar mesa ${table.label}`,
    details: `Mesa ${table.label}`,
    order: `Lançar pedido · Mesa ${table.label}`,
    checkout: `Conta da mesa ${table.label}`,
  };
  const subtitle = data
    ? `${data.session.people || 'Sem'} ${data.session.people === 1 ? 'pessoa' : 'pessoas'} · aberta há ${since(data.session.openedAt)} por ${data.session.openedBy || '—'}`
    : `${table.seats} lugares · ${table.floorName}`;
  const pendingOk = data && (mode !== 'checkout' || can('checkout'));

  let body;
  if (closed) {
    body = (
      <div className="ops-closed">
        <span className="co-done__icon"><CheckIcon size={30} /></span>
        <h3>Conta fechada</h3>
        <p>{BRL(closed.bill.total)}{closed.bill.service ? ` (com ${BRL(closed.bill.service)} de serviço)` : ''}. A mesa {table.label} está livre.</p>
        <button type="button" className="lx-btn lx-btn--primary lx-btn--block" onClick={onClose}>Concluir</button>
      </div>
    );
  } else if (sessionId && !data) {
    body = loadError ? <div className="lx-alert lx-alert--error"><AlertIcon size={18} />{loadError}</div> : <p className="lx-hint">Carregando…</p>;
  } else if (mode === 'open') {
    body = (
      <>
        <div className="ops-open">
          <span className="lx-label">Quantas pessoas?</span>
          <Stepper value={people} onChange={setPeople} min={1} max={99} label="Pessoas na mesa" />
          {people > table.seats && <small className="ops-warn">A mesa tem {table.seats} lugares.</small>}
        </div>
        {reservation && (
          <label className="adm-toggle ops-open__res">
            <span>
              <strong><CalendarIcon size={14} /> Reserva de {reservation.name} às {reservation.time}</strong>
              <small>{reservation.people} pessoas · marca a reserva como “compareceu”.</small>
            </span>
            <Switch checked={useReservation} onChange={(v) => { setUseReservation(v); if (v) setPeople(reservation.people); }} label="É esta reserva" />
          </label>
        )}
        <div className="ops-sheet__actions">
          <button type="button" className="lx-btn lx-btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="lx-btn lx-btn--primary" onClick={open} disabled={busy}>
            {busy ? <span className="lx-spinner" aria-label="Ocupando" /> : `Ocupar com ${people} ${people === 1 ? 'pessoa' : 'pessoas'}`}
          </button>
        </div>
      </>
    );
  } else if (mode === 'order') {
    body = <ItemPicker onSend={sendOrder} onBack={() => setMode('details')} sending={busy} />;
  } else if (mode === 'checkout' && pendingOk) {
    body = (
      <Checkout
        data={data}
        onClose={onClose}
        onBack={initialMode === 'checkout' ? null : () => setMode('details')}
        onDone={(result) => {
          setClosed(result);
          onChanged();
        }}
      />
    );
  } else {
    const valid = data.orders.filter((o) => o.status !== 'canceled');
    body = (
      <>
        <div className="ops-open ops-open--inline">
          <span className="lx-label">Pessoas na mesa</span>
          <Stepper value={people} onChange={changePeople} min={0} max={99} label="Pessoas na mesa" />
        </div>
        {valid.length ? (
          <ul className="ops-orders">
            {data.orders.map((o) => {
              const [label, tone] = ORDER_STATUS[o.status] ?? ['', 'muted'];
              return (
                <li key={o.id} className={o.status === 'canceled' ? 'is-canceled' : ''}>
                  <header>
                    <strong>#{o.number}</strong>
                    <small>{o.createdBy ? `por ${o.createdBy}` : 'pelo celular do cliente'} · {since(o.createdAt)}</small>
                    <span className={`lx-badge lx-badge--${tone}`}>{label}</span>
                  </header>
                  <p>{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</p>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="adm-empty"><BagIcon size={20} /><strong>Nenhum pedido ainda</strong><span>Lance o pedido aqui ou o cliente pede pelo celular.</span></div>
        )}
        <div className="ops-bill__total ops-bill__total--line"><span>Consumo até agora</span><strong>{BRL(data.bill.subtotal)}</strong></div>
        <div className="ops-sheet__actions ops-sheet__actions--wrap">
          {!valid.length && <button type="button" className="lx-btn lx-btn--plain adm-danger-text" onClick={release}>Liberar mesa</button>}
          <button type="button" className="lx-btn lx-btn--secondary" onClick={() => setMode('order')}><PlusIcon size={15} /> Lançar pedido</button>
          {can('checkout') && (
            <button type="button" className="lx-btn lx-btn--primary" onClick={() => setMode('checkout')}><ReceiptIcon size={15} /> Fechar conta</button>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="ops-sheet" role="dialog" aria-modal="true" aria-label={titles[mode]} onClick={onClose}>
      <div className={`ops-sheet__card ${mode === 'order' ? 'is-tall' : ''}`} onClick={(e) => e.stopPropagation()}>
        <header className="ops-sheet__head">
          <div>
            <h2>{closed ? `Mesa ${table.label}` : titles[mode]}</h2>
            {!closed && <p>{subtitle}</p>}
          </div>
          <button type="button" className="ops-sheet__close" onClick={onClose} aria-label="Fechar"><CloseIcon size={18} /></button>
        </header>
        {body}
      </div>
    </div>
  );
}

/** Mesa em que um QR Code ou número caiu, com a sessão aberta e a próxima reserva de hoje. */
export function useTableLookup(overview) {
  return useMemo(() => {
    const sessions = new Map((overview?.sessions ?? []).map((s) => [s.tableId, s]));
    const reservations = new Map();
    for (const r of overview?.reservations ?? []) if (r.status === 'confirmed' && !reservations.has(r.tableId)) reservations.set(r.tableId, r);
    return { sessions, reservations };
  }, [overview]);
}
