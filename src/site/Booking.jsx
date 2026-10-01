import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { allTables, maxTableSeats } from '../../shared/floor.js';
import { addDaysIso, reservationSlots, reservationWindow } from '../../shared/site.js';
import { api } from '../lib/api.js';
import { AlertIcon, CalendarIcon, CheckIcon, ClockIcon, PhoneIcon, UsersIcon } from '../icons.jsx';
import { FloorView, transposeFloor } from './FloorShapes.jsx';
import { SButton } from './SButton.jsx';
import { useCustomer } from './customer.jsx';
import { useSite } from './SiteContext.jsx';

/** Primeira data (a partir de hoje) com horários livres. */
function firstBookableDate(site) {
  const { first, last } = reservationWindow(site);
  for (let d = first; d <= last; d = addDaysIso(d, 1)) if (reservationSlots(site, d).length) return d;
  return first;
}

function useNarrow(ref, limit = 560) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('ResizeObserver' in window)) return undefined;
    const observer = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < limit));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, limit]);
  return narrow;
}

export default function Booking() {
  const { site, slug, lang, locale, t, tx, editing } = useSite();
  const { customer, requireLogin } = useCustomer();
  const navigate = useNavigate();
  const tables = allTables(site);
  const maxSeats = maxTableSeats(site);
  const window_ = reservationWindow(site);

  const [date, setDate] = useState(() => firstBookableDate(site));
  const slots = useMemo(() => reservationSlots(site, date), [site, date]);
  const [time, setTime] = useState(() => slots.find((s) => s >= '20:00') ?? slots[0] ?? '');
  const [party, setParty] = useState(2);
  const [floorId, setFloorId] = useState(site.floors[0]?.id);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(null);
  const planRef = useRef(null);
  const narrow = useNarrow(planRef);

  useEffect(() => {
    if (!slots.includes(time)) setTime(slots[0] ?? '');
  }, [slots, time]);

  useEffect(() => {
    if (!site.floors.some((f) => f.id === floorId)) setFloorId(site.floors[0]?.id);
  }, [site.floors, floorId]);

  // Ocupação real só no site publicado; no painel tudo aparece livre.
  useEffect(() => {
    setSelected(null);
    setError('');
    if (editing || !slug || !time) {
      setBusy([]);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    api
      .get(`s/${slug}/availability?date=${date}&time=${time}`)
      .then((data) => alive && setBusy(data.busy))
      .catch(() => alive && setBusy([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [editing, slug, date, time, party]);

  const formatDate = (iso, opts) => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...opts }).format(new Date(`${iso}T12:00:00Z`));
  const formatTime = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, 0, 1, h, m)));
  };

  const stateOf = (table) => {
    if (selected?.id === table.id) return 'selected';
    if (busy.includes(table.id)) return 'occupied';
    if (table.seats < party) return 'unsuitable';
    return 'available';
  };

  const floor = site.floors.find((f) => f.id === floorId) ?? site.floors[0];
  const shownFloor = floor && narrow && floor.width > floor.height ? transposeFloor(floor) : floor;
  const availableCount = tables.filter((tb) => tb.floorId === floor?.id && stateOf(tb) === 'available').length;
  const phone = site.contact.whatsapp || site.contact.phone;

  const confirm = async () => {
    if (editing || !selected) return;
    if (!customer) {
      requireLogin(t('auth.required'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      setConfirmed(await api.post(`s/${slug}/reservations`, { date, time, partySize: party, tableId: selected.id }));
    } catch (err) {
      // Mensagens do servidor vêm em português; no site usamos as do idioma escolhido.
      setError(err.status === 409 ? t('reserve.taken') : err.status === 401 ? t('auth.required') : t('reserve.error'));
      if (err.status === 409) {
        setBusy((b) => [...b, selected.id]);
        setSelected(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <div className="s-booking-success s-glass s-panel" role="status">
        <span className="s-booking-success__icon"><CheckIcon size={28} /></span>
        <h3>{t('reserve.successTitle')}</h3>
        <p>
          {t('reserve.successText', {
            table: confirmed.tableLabel,
            guests: t('common.guests', { count: confirmed.partySize }),
            date: formatDate(confirmed.date, { weekday: 'long', day: 'numeric', month: 'long' }),
            time: formatTime(confirmed.time),
          })}
        </p>
        <p className="s-booking-success__code">{t('reserve.code')}: <strong>{confirmed.code}</strong></p>
        {confirmed.promo && (
          <p className="s-promo-note">{t('reserve.promo', { title: confirmed.promo.title, code: confirmed.promo.code || confirmed.code })}</p>
        )}
        <p className="s-muted">{t('reserve.policy')}</p>
        <div className="s-booking-success__actions">
          <SButton onClick={() => navigate(`/${slug}/conta`)}>{t('reserve.mine')}</SButton>
          <SButton variant="glass" onClick={() => { setConfirmed(null); setSelected(null); }}>{t('reserve.another')}</SButton>
        </div>
      </div>
    );
  }

  const partyOptions = Array.from({ length: Math.max(1, Math.min(maxSeats, 12)) }, (_, i) => i + 1);
  const floors = site.floors;

  return (
    <div className="s-booking">
      <div className="s-booking__controls s-glass">
        <label className="s-booking__control">
          <span><CalendarIcon size={16} /> {t('reserve.date')}</span>
          <input type="date" className="s-select" value={date} min={window_.first} max={window_.last} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        <label className="s-booking__control">
          <span><ClockIcon size={16} /> {t('reserve.time')}</span>
          <select className="s-select" value={time} onChange={(e) => setTime(e.target.value)} disabled={!slots.length}>
            {slots.map((slot) => <option key={slot} value={slot}>{formatTime(slot)}</option>)}
          </select>
        </label>
        <div className="s-booking__control s-booking__control--party">
          <span id="s-party-label"><UsersIcon size={16} /> {t('reserve.party')}</span>
          <div className="s-party" role="radiogroup" aria-labelledby="s-party-label">
            {partyOptions.map((n) => (
              <button key={n} type="button" role="radio" aria-checked={party === n} className={`s-party__btn ${party === n ? 'is-active' : ''}`} onClick={() => setParty(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="s-booking__grid">
        <div className="s-booking__plan s-glass s-panel" ref={planRef}>
          <div className="s-booking__plan-head">
            <div>
              <h3>{t('reserve.floorPlan')}</h3>
              <p className="s-muted">{t('reserve.floorPlanHint')}</p>
            </div>
            {floors.length > 1 && (
              <div className="s-tabs s-tabs--small" role="tablist">
                {floors.map((f) => (
                  <button key={f.id} type="button" role="tab" aria-selected={f.id === floor?.id} className={`s-tab ${f.id === floor?.id ? 'is-active' : ''}`} onClick={() => setFloorId(f.id)}>
                    {tx(f.name)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!slots.length ? (
            <p className="s-booking__none">{t('reserve.noSlots')}</p>
          ) : shownFloor ? (
            <div className={`s-booking__floor ${loading ? 'is-loading' : ''}`}>
              <FloorView
                floor={shownFloor}
                lang={lang}
                stateOf={stateOf}
                onSelect={setSelected}
                ariaLabel={t('reserve.floorPlan')}
                tableAria={(tb, state) => `${t('reserve.table')} ${tb.label}, ${t('common.seats', { count: tb.seats })}, ${t(`reserve.legend.${state}`)}`}
              />
            </div>
          ) : null}

          <ul className="s-legend">
            {['available', 'selected', 'occupied', 'unsuitable'].map((state) => (
              <li key={state}><span className={`s-legend__swatch s-legend__swatch--${state}`} />{t(`reserve.legend.${state}`)}</li>
            ))}
          </ul>
          {slots.length > 0 && availableCount === 0 && !loading && <p className="s-booking__none">{t('reserve.noneAvailable')}</p>}
          {phone && <p className="s-muted s-booking__large"><PhoneIcon size={14} /> {t('reserve.largeParty', { max: maxSeats })} {phone}</p>}
        </div>

        <div className="s-booking__summary s-glass s-panel">
          <h3>{t('reserve.yourReservation')}</h3>
          <dl className="s-facts">
            <div><dt>{t('reserve.date')}</dt><dd>{formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' })}</dd></div>
            <div><dt>{t('reserve.time')}</dt><dd>{time ? formatTime(time) : '—'}</dd></div>
            <div><dt>{t('reserve.party')}</dt><dd>{t('common.guests', { count: party })}</dd></div>
            <div>
              <dt>{t('reserve.table')}</dt>
              <dd>{selected ? `${selected.label} · ${t('common.seats', { count: selected.seats })}` : <span className="s-muted">{t('reserve.selectTable')}</span>}</dd>
            </div>
          </dl>
          {customer && <p className="s-muted s-booking__who">{customer.name} · {customer.phone}</p>}
          {error && <div className="s-alert" role="alert"><AlertIcon size={18} />{error}</div>}
          {editing && <p className="s-muted s-booking__note">Prévia do painel: as reservas funcionam no site publicado.</p>}
          <SButton size="lg" block disabled={!selected || editing} loading={submitting} onClick={confirm}>
            {submitting ? t('reserve.confirming') : customer || editing ? t('reserve.confirm') : t('reserve.login')}
          </SButton>
          <p className="s-muted s-booking__policy">{t('reserve.policy')}</p>
        </div>
      </div>
    </div>
  );
}
