import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { AlertIcon, ArrowLeftIcon, CalendarIcon, LogoutIcon, StarIcon, StoreIcon, TruckIcon } from '../icons.jsx';
import { SButton } from './SButton.jsx';
import { useCustomer } from './customer.jsx';
import { useSite } from './SiteContext.jsx';

function Stars({ value }) {
  return (
    <span className="s-stars" aria-label={`${value} / 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="s-star">
            <StarIcon size={22} />
            <span className="s-star__fill" style={{ width: `${fill * 100}%` }}><StarIcon size={22} /></span>
          </span>
        );
      })}
    </span>
  );
}

export default function AccountPage() {
  const { slug, t, tx, locale, formatPrice } = useSite();
  const { customer, openAuth, logout, refresh } = useCustomer();
  const navigate = useNavigate();
  const [data, setData] = useState({ status: 'idle', reservations: [], orders: [] });

  const load = useCallback(() => {
    setData((d) => ({ ...d, status: 'loading' }));
    Promise.all([api.get(`s/${slug}/me/reservations`), api.get(`s/${slug}/me/orders`)])
      .then(([r, o]) => setData({ status: 'ready', reservations: r.reservations, orders: o.orders }))
      .catch(() => setData({ status: 'error', reservations: [], orders: [] }));
  }, [slug]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (customer) load();
  }, [customer, load]);

  // Pedidos em andamento atualizam sozinhos.
  useEffect(() => {
    if (!customer || !data.orders.some((o) => !['delivered', 'canceled'].includes(o.status))) return undefined;
    const timer = setInterval(load, 15_000);
    return () => clearInterval(timer);
  }, [customer, data.orders, load]);

  const date = (iso, time) =>
    `${new Intl.DateTimeFormat(locale, { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`))} · ${time}`;
  const dateTime = (value) => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));

  const cancelReservation = async (r) => {
    if (!window.confirm(t('account.cancelConfirm'))) return;
    try {
      await api.post(`s/${slug}/me/reservations/${r.id}/cancel`);
    } catch (err) {
      window.alert(err.message);
    }
    load();
    refresh();
  };
  const cancelOrder = async (o) => {
    if (!window.confirm(t('orders.cancelConfirm'))) return;
    try {
      await api.post(`s/${slug}/me/orders/${o.id}/cancel`);
    } catch (err) {
      window.alert(err.message);
    }
    load();
    refresh();
  };

  return (
    <section className="s-section s-account">
      <div className="s-container">
        <button type="button" className="s-link s-account__back" onClick={() => navigate(`/${slug}`)}>
          <ArrowLeftIcon size={16} /> {t('account.back')}
        </button>

        {customer === undefined ? null : !customer ? (
          <div className="s-state s-state--action">
            <strong>{t('auth.required')}</strong>
            <SButton onClick={() => openAuth('login')}>{t('nav.signIn')}</SButton>
          </div>
        ) : (
          <>
            <div className="s-account__head">
              <div>
                <span className="s-eyebrow">{t('account.title')}</span>
                <h2 className="s-section__title">{t('account.hello', { name: customer.name.split(' ')[0] })}</h2>
                <p className="s-muted">{customer.email}</p>
              </div>
              <div className="s-score s-glass">
                <small>{t('account.score')}</small>
                <strong>{customer.score.toFixed(1)}</strong>
                <Stars value={customer.score} />
                <p>{t('account.scoreHint')}</p>
              </div>
            </div>

            {data.status === 'error' && <div className="s-alert"><AlertIcon size={18} />{t('cart.error')}</div>}

            <div className="s-account__grid">
              <div className="s-panel s-glass-lite">
                <h3><CalendarIcon size={18} /> {t('account.reservations')}</h3>
                <p className="s-muted s-account__policy">{t('account.policy')}</p>
                {!data.reservations.length ? (
                  <p className="s-muted">{t('account.none')}</p>
                ) : (
                  <ul className="s-list">
                    {data.reservations.map((r) => (
                      <li key={r.id}>
                        <div>
                          <strong>{date(r.date, r.time)}</strong>
                          <span className="s-muted">{t('reserve.table')} {r.tableLabel} · {t('common.guests', { count: r.partySize })} · {r.code}</span>
                          {r.promo?.code && r.status === 'confirmed' && <span className="s-badge">{r.promo.title} · {r.promo.code}</span>}
                          {r.status === 'confirmed' && (
                            <small className="s-muted">{r.canCancel ? t('account.cancelUntil', { time: dateTime(r.cancelUntil) }) : t('account.cannotCancel')}</small>
                          )}
                        </div>
                        <div className="s-list__side">
                          <span className={`s-status is-${r.status}`}>{t(`account.status.${r.status}`)}</span>
                          {r.canCancel && <button type="button" className="s-link s-link--danger" onClick={() => cancelReservation(r)}>{t('account.cancel')}</button>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="s-panel s-glass-lite">
                <h3><TruckIcon size={18} /> {t('account.orders')}</h3>
                {!data.orders.length ? (
                  <p className="s-muted">{t('account.none')}</p>
                ) : (
                  <ul className="s-list">
                    {data.orders.map((o) => (
                      <li key={o.id}>
                        <div>
                          <strong>{t('orders.number', { number: o.number })} · {formatPrice(o.total)}</strong>
                          <span className="s-muted">
                            {o.type === 'table' ? <><StoreIcon size={13} /> {t('orders.table', { table: o.table })}</> : <><TruckIcon size={13} /> {t('orders.delivery')}</>} · {dateTime(o.createdAt)}
                          </span>
                          <small className="s-muted">{o.items.map((i) => `${i.qty}× ${tx(i.name)}`).join(', ')}</small>
                        </div>
                        <div className="s-list__side">
                          <span className={`s-status is-${o.status}`}>{t(`orders.status.${o.status}`)}</span>
                          {o.status === 'received' && <button type="button" className="s-link s-link--danger" onClick={() => cancelOrder(o)}>{t('orders.cancel')}</button>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <SButton variant="glass" icon={<LogoutIcon size={16} />} onClick={async () => { await logout(); navigate(`/${slug}`); }}>
              {t('account.signOut')}
            </SButton>
          </>
        )}
      </div>
    </section>
  );
}
