import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventTime } from '../../../shared/policy.js';
import { api } from '../../lib/api.js';
import { AlertIcon, CalendarIcon, CheckIcon, PhoneIcon, RotateIcon, StarIcon, UsersIcon } from '../../icons.jsx';
import { useOps } from '../OpsContext.jsx';

const dateLabel = (iso, today) => {
  if (iso === today) return 'Hoje';
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
};

const STATUS = {
  confirmed: ['Confirmada', 'info'],
  attended: ['Compareceu', 'success'],
  no_show: ['Não veio', 'danger'],
  canceled: ['Cancelada', 'muted'],
};

export default function ReservationsPage() {
  const { showToast, can } = useOps();
  const [state, setState] = useState({ status: 'loading', list: [], today: '' });

  const load = useCallback(() => {
    api
      .get('restaurant/reservations')
      .then(({ reservations, today }) => setState({ status: 'ready', list: reservations, today }))
      .catch((err) => setState({ status: 'error', list: [], message: err.message }));
  }, []);
  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const setStatus = async (r, status, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      const res = await api.post(`restaurant/reservations/${r.id}/status`, { status });
      if (status === 'attended') showToast(res.tableSessionId ? `${r.name} chegou · mesa ${r.tableLabel} ocupada` : `${r.name} chegou · a mesa ${r.tableLabel} já estava ocupada`);
      load();
    } catch (err) {
      showToast(err.message);
    }
  };

  const groups = state.list.reduce((acc, r) => {
    (acc[r.date] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="ops-page">
      <header className="ops-head">
        <div>
          <h1>Reservas</h1>
          <p className="ops-head__lead">Quem reservou pelo site, a nota de cada cliente e a presença. “Chegou” já ocupa a mesa reservada.</p>
        </div>
        <button type="button" className="lx-btn lx-btn--plain lx-btn--sm" onClick={load}><RotateIcon size={14} /> Atualizar</button>
      </header>

      {state.status === 'loading' && <p className="lx-hint">Carregando…</p>}
      {state.status === 'error' && <div className="lx-alert lx-alert--error"><AlertIcon size={18} />{state.message}</div>}
      {state.status === 'ready' && !state.list.length && (
        <div className="adm-empty">
          <CalendarIcon size={22} />
          <strong>Nenhuma reserva por enquanto</strong>
          <span>Quando os clientes reservarem pelo site, elas aparecem aqui.{can('site') && <> As regras de reserva ficam em <Link to="/painel/site">Editar site › Reservas</Link>.</>}</span>
        </div>
      )}

      {Object.entries(groups).map(([date, list]) => (
        <section key={date} className="ops-card">
          <h2 className="ops-day">{dateLabel(date, state.today)} <span>{list.filter((r) => r.status !== 'canceled').reduce((s, r) => s + r.partySize, 0)} pessoas</span></h2>
          <ul className="adm-res">
            {list.map((r) => {
              const started = eventTime(r.date, r.time) <= Date.now() + 30 * 60_000; // libera "Chegou" 30 min antes
              const past = eventTime(r.date, r.time) <= Date.now();
              const [label, tone] = STATUS[r.status];
              return (
                <li key={r.id} className={`is-${r.status}`}>
                  <span className="adm-res__time">{r.time}</span>
                  <span className="adm-res__info">
                    <strong>
                      {r.name}
                      {r.score !== null && (
                        <span className={`adm-score ${r.score < 3 ? 'is-low' : ''}`} title="Nota do cliente (0 a 5)"><StarIcon size={11} /> {r.score.toFixed(1)}</span>
                      )}
                    </strong>
                    <small>
                      <UsersIcon size={12} /> {r.partySize} · Mesa {r.tableLabel} · <PhoneIcon size={12} /> <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`}>{r.phone}</a> · {r.code}
                    </small>
                    {r.promo && <small className="adm-ok-text">{r.promo.title}{r.promo.code ? ` · ${r.promo.code}` : ''}</small>}
                    {r.status === 'canceled' && <small>Cancelada {r.canceledBy === 'customer' ? 'pelo cliente' : 'pelo restaurante'}</small>}
                  </span>
                  <span className="adm-res__side">
                    <span className={`lx-badge lx-badge--${tone}`}>{label}</span>
                    {r.status === 'confirmed' && started && (
                      <span className="adm-res__actions">
                        <button type="button" className="lx-btn lx-btn--secondary lx-btn--sm" onClick={() => setStatus(r, 'attended')}><CheckIcon size={13} /> Chegou</button>
                        {past && <button type="button" className="lx-btn lx-btn--plain lx-btn--sm adm-danger-text" onClick={() => setStatus(r, 'no_show', `Marcar que ${r.name} não veio? A nota do cliente cai.`)}>Não veio</button>}
                      </span>
                    )}
                    {r.status === 'confirmed' && !past && (
                      <button type="button" className="lx-btn lx-btn--plain lx-btn--sm adm-danger-text" onClick={() => setStatus(r, 'canceled', `Cancelar a reserva de ${r.name}? A nota do cliente não muda.`)}>Cancelar</button>
                    )}
                    {['attended', 'no_show'].includes(r.status) && (
                      <button type="button" className="lx-btn lx-btn--plain lx-btn--sm" onClick={() => setStatus(r, 'confirmed')}>Desfazer</button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div className="lx-alert lx-alert--info">
        <StarIcon size={18} />
        <span>
          <strong>Nota do cliente (0 a 5):</strong> calculada separadamente para reservas e pedidos e depois tirada a média.
          Cada cancelamento ou falta tira 1 ponto, diluído pelas vezes que o cliente compareceu.
        </span>
      </div>
    </div>
  );
}
