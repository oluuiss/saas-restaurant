import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import {
  AlertIcon, BellIcon, CalendarIcon, CheckIcon, ChevronRightIcon, ClockIcon, PaletteIcon, PhoneIcon, ReceiptIcon, ScanIcon, TruckIcon, UsersIcon,
} from '../../icons.jsx';
import { BRL, ago, since, useOps } from '../OpsContext.jsx';
import { TableScanner } from '../Qr.jsx';
import TableSheet, { useTableLookup } from '../TableSheet.jsx';

const DELIVERY_STATUS = {
  received: ['Novo', 'warning'],
  preparing: ['Em preparo', 'info'],
  out_for_delivery: ['Saiu para entrega', 'info'],
  ready: ['Pronto', 'info'],
};

function greeting() {
  const h = Number(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Sao_Paulo' }).format(new Date()));
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function Stat({ label, value, sub, tone, Icon }) {
  return (
    <div className={`ops-stat ${tone ? `is-${tone}` : ''}`}>
      <span className="ops-stat__label">{Icon && <Icon size={15} />} {label}</span>
      <strong className="ops-stat__value">{value}</strong>
      {sub && <small className="ops-stat__sub">{sub}</small>}
    </div>
  );
}

export default function HomePage() {
  const { me, can, context, showToast, refreshActivity } = useOps();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');
  const [scan, setScan] = useState(null); // 'open' | 'checkout'
  const [sheet, setSheet] = useState(null); // { table, mode, reservation }
  const lookup = useTableLookup(overview);

  const load = useCallback(() => {
    api
      .get('ops/overview')
      .then((d) => {
        setOverview(d);
        setError('');
      })
      .catch((err) => setError(err.message));
  }, []);
  useEffect(() => {
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [load]);

  const tables = context.tables;
  const changed = () => {
    load();
    refreshActivity();
  };

  const openTable = (table, mode, reservation) => setSheet({ table, mode, reservation });
  const fromScan = (table) => {
    const session = lookup.sessions.get(table.id);
    const kind = scan;
    setScan(null);
    if (kind === 'checkout') {
      if (!session) {
        showToast(`A mesa ${table.label} está livre: não há conta para fechar.`);
        return;
      }
      openTable(table, 'checkout');
    } else {
      openTable(table, session ? 'details' : 'open');
    }
  };

  const attendCall = async (call) => {
    try {
      await api.post(`restaurant/calls/${call.id}/done`);
      changed();
    } catch (err) {
      showToast(err.message);
    }
  };

  const arrived = async (r) => {
    if (lookup.sessions.has(r.tableId)) {
      showToast(`A mesa ${r.table} está ocupada. Libere ou feche a conta antes.`);
      return;
    }
    const table = tables.find((t) => t.id === r.tableId);
    if (table) openTable(table, 'open', r);
  };

  const sessions = overview?.sessions ?? [];
  const peopleNow = sessions.reduce((s, x) => s + x.people, 0);
  const seats = tables.reduce((s, t) => s + t.seats, 0);
  const calls = overview?.calls ?? [];
  const callingTables = new Set(calls.map((c) => c.table));
  const upcoming = (overview?.reservations ?? []).filter((r) => r.status === 'confirmed');
  const firstName = me.member.name.split(/\s+/)[0];
  const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date());

  return (
    <div className="ops-page">
      <header className="ops-head">
        <div>
          <p className="ops-head__eyebrow">{today}</p>
          <h1>{greeting()}, {firstName}</h1>
        </div>
        {can('tables') && (
          <div className="ops-head__actions">
            <button type="button" className="lx-btn lx-btn--primary ops-scanbtn" onClick={() => setScan('open')}>
              <ScanIcon size={18} /> Ocupar mesa
            </button>
            {can('checkout') && (
              <button type="button" className="lx-btn lx-btn--secondary ops-scanbtn" onClick={() => setScan('checkout')}>
                <ReceiptIcon size={18} /> Checkout da mesa
              </button>
            )}
          </div>
        )}
      </header>

      {!me.restaurant.published && can('site') && (
        <Link to="/painel/site" className="ops-setup">
          <span className="ops-setup__icon"><PaletteIcon size={20} /></span>
          <span>
            <strong>Monte e publique o site do restaurante</strong>
            <small>Cardápio, fotos, planta do salão com as mesas e reservas. Os clientes pedem e reservam por ele.</small>
          </span>
          <ChevronRightIcon size={18} />
        </Link>
      )}

      {error && <div className="lx-alert lx-alert--error"><AlertIcon size={18} />{error}</div>}

      <section className="ops-stats" aria-label="Agora no restaurante">
        <Stat label="Pessoas na casa" value={overview ? peopleNow : '—'} sub={seats ? `${seats} lugares no salão` : null} Icon={UsersIcon} tone="hero" />
        <Stat label="Mesas ocupadas" value={overview ? `${sessions.length}/${tables.length}` : '—'} sub={tables.length ? `${tables.length - sessions.length} livres` : 'Desenhe as mesas na planta'} />
        <Stat label="Chamando atendente" value={overview ? calls.length : '—'} tone={calls.length ? 'alert' : null} Icon={BellIcon} />
        <Stat label="Delivery em aberto" value={overview ? overview.deliveries.length : '—'} Icon={TruckIcon} />
        <Stat label="Reservas hoje" value={overview ? overview.reservations.length : '—'} sub={upcoming.length ? `próxima às ${upcoming[0].time}` : null} Icon={CalendarIcon} />
        {overview?.revenueToday !== null && overview?.revenueToday !== undefined && (
          <Stat label="Faturamento hoje" value={BRL(overview.revenueToday)} sub={`${overview.counts.peopleToday} pessoas atendidas`} />
        )}
      </section>

      {calls.length > 0 && (
        <section className="ops-card ops-card--alert">
          <h2><BellIcon size={17} /> Mesas chamando</h2>
          <ul className="adm-calls">
            {calls.map((c) => (
              <li key={c.id}>
                <span className="adm-calls__icon"><BellIcon size={16} /></span>
                <span><strong>Mesa {c.table}</strong><small>{ago(c.createdAt)}</small></span>
                {(can('tables') || can('orders')) && (
                  <button type="button" className="lx-btn lx-btn--secondary lx-btn--sm" onClick={() => attendCall(c)}><CheckIcon size={14} /> Atendido</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="ops-card">
        <div className="ops-card__head">
          <h2>Salão</h2>
          <span className="ops-legend">
            <i className="is-free" /> Livre <i className="is-busy" /> Ocupada <i className="is-calling" /> Chamando
          </span>
        </div>
        {!tables.length ? (
          <div className="adm-empty">
            <strong>Nenhuma mesa cadastrada</strong>
            <span>{can('site') ? <>Desenhe as mesas em <Link to="/painel/site">Editar site › Planta do salão</Link>.</> : 'Peça ao gerente para desenhar a planta do salão.'}</span>
          </div>
        ) : (
          context.floors.map((floor) => {
            const list = tables.filter((t) => t.floorId === floor.id);
            if (!list.length) return null;
            return (
              <div key={floor.id} className="ops-floor">
                {context.floors.length > 1 && <h3>{floor.name}</h3>}
                <div className="ops-tables">
                  {list.map((t) => {
                    const s = lookup.sessions.get(t.id);
                    const r = lookup.reservations.get(t.id);
                    const calling = callingTables.has(t.label);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={`ops-table ${s ? 'is-busy' : 'is-free'} ${calling ? 'is-calling' : ''}`}
                        onClick={() => (can('tables') || (s && can('checkout')) ? openTable(t, s ? 'details' : 'open') : null)}
                        disabled={!can('tables') && !(s && can('checkout'))}
                      >
                        <span className="ops-table__label">{t.label}</span>
                        {s ? (
                          <>
                            <span className="ops-table__line"><UsersIcon size={13} /> {s.people}/{t.seats}</span>
                            <span className="ops-table__line"><ClockIcon size={13} /> {since(s.openedAt)}</span>
                            <span className="ops-table__total">{BRL(s.subtotal)}</span>
                            {s.pending > 0 && <span className="ops-table__badge">{s.pending} na cozinha</span>}
                          </>
                        ) : (
                          <>
                            <span className="ops-table__line">{t.seats} lugares</span>
                            {r && <span className="ops-table__res"><CalendarIcon size={12} /> {r.time} · {r.people}p</span>}
                          </>
                        )}
                        {calling && <span className="ops-table__bell"><BellIcon size={13} /></span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </section>

      <div className="ops-grid2">
        <section className="ops-card">
          <div className="ops-card__head">
            <h2><TruckIcon size={17} /> Delivery</h2>
            {can('orders') && <Link to="/painel/pedidos" className="lx-btn lx-btn--plain lx-btn--sm">Ver pedidos <ChevronRightIcon size={14} /></Link>}
          </div>
          {!overview?.deliveries.length ? (
            <p className="lx-hint" style={{ margin: 0 }}>Nenhum pedido de delivery em aberto.</p>
          ) : (
            <ul className="ops-list">
              {overview.deliveries.map((o) => {
                const [label, tone] = DELIVERY_STATUS[o.status] ?? ['', 'muted'];
                return (
                  <li key={o.id}>
                    <strong>#{o.number}</strong>
                    <span className="ops-list__main">{o.name || 'Cliente'}<small>{[o.district, ago(o.createdAt), o.paid && 'pago online'].filter(Boolean).join(' · ')}</small></span>
                    <span className={`lx-badge lx-badge--${tone}`}>{label}</span>
                    <em>{BRL(o.total)}</em>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="ops-card">
          <div className="ops-card__head">
            <h2><CalendarIcon size={17} /> Reservas de hoje</h2>
            {can('reservations') && <Link to="/painel/reservas" className="lx-btn lx-btn--plain lx-btn--sm">Ver todas <ChevronRightIcon size={14} /></Link>}
          </div>
          {!overview?.reservations.length ? (
            <p className="lx-hint" style={{ margin: 0 }}>Nenhuma reserva para hoje.</p>
          ) : (
            <ul className="ops-list">
              {overview.reservations.map((r) => (
                <li key={r.id} className={r.status === 'attended' ? 'is-done' : ''}>
                  <strong>{r.time}</strong>
                  <span className="ops-list__main">
                    {r.name}
                    <small><UsersIcon size={12} /> {r.people} · Mesa {r.table} · <PhoneIcon size={12} /> {r.phone}</small>
                  </span>
                  {r.status === 'attended' ? (
                    <span className="lx-badge lx-badge--success">Chegou</span>
                  ) : can('tables') ? (
                    <button type="button" className="lx-btn lx-btn--secondary lx-btn--sm" onClick={() => arrived(r)}>Chegou</button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {scan && (
        <TableScanner
          title={scan === 'checkout' ? 'Checkout da mesa' : 'Ocupar mesa'}
          hint={scan === 'checkout' ? 'Escaneie o QR Code da mesa para ver quanto ela gastou.' : 'Escaneie o QR Code da mesa para registrar quem sentou.'}
          slug={me.restaurant.slug}
          tables={tables}
          onTable={fromScan}
          onClose={() => setScan(null)}
        />
      )}
      {sheet && (
        <TableSheet
          key={`${sheet.table.id}:${sheet.mode}`}
          table={sheet.table}
          sessionId={lookup.sessions.get(sheet.table.id)?.id}
          reservation={sheet.reservation ?? lookup.reservations.get(sheet.table.id)}
          initialMode={sheet.mode}
          onClose={() => setSheet(null)}
          onChanged={changed}
        />
      )}
    </div>
  );
}
