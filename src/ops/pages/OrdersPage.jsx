import { useCallback, useEffect, useState } from 'react';
import { tr } from '../../../shared/i18n.js';
import { BRAND_NAMES } from '../../../shared/payments.js';
import { api } from '../../lib/api.js';
import { AlertIcon, BagIcon, BellIcon, CheckIcon, MapPinIcon, PhoneIcon, RotateIcon, StoreIcon, TruckIcon } from '../../icons.jsx';
import { BRL, ago, useOps } from '../OpsContext.jsx';

const STATUS = {
  received: { label: 'Novo', tone: 'warning' },
  preparing: { label: 'Em preparo', tone: 'info' },
  out_for_delivery: { label: 'Saiu para entrega', tone: 'info' },
  ready: { label: 'Pronto', tone: 'info' },
  delivered: { label: 'Entregue', tone: 'success' },
  canceled: { label: 'Cancelado', tone: 'danger' },
};

/** Próximo passo de cada pedido. */
function nextStep(order) {
  if (order.status === 'received') return { status: 'preparing', label: 'Aceitar e preparar' };
  if (order.status === 'preparing') return order.type === 'delivery' ? { status: 'out_for_delivery', label: 'Saiu para entrega' } : { status: 'ready', label: 'Pronto para servir' };
  if (order.status === 'out_for_delivery' || order.status === 'ready') return { status: 'delivered', label: order.type === 'delivery' ? 'Entregue' : 'Servido na mesa' };
  return null;
}

const PAYMENT = { on_delivery: 'Pagar na entrega', online: 'Pago online', at_table: 'Na conta da mesa' };
const COLUMNS = [
  { id: 'new', title: 'Novos', statuses: ['received'] },
  { id: 'prep', title: 'Em preparo', statuses: ['preparing'] },
  { id: 'out', title: 'Prontos e a caminho', statuses: ['ready', 'out_for_delivery'] },
];

function OrderCard({ o, act }) {
  const { context } = useOps();
  const next = nextStep(o);
  const st = STATUS[o.status];
  const open = !['delivered', 'canceled'].includes(o.status);
  return (
    <article className={`adm-order is-${o.status}`}>
      <header className="adm-order__head">
        <span className="adm-order__num">#{o.number}</span>
        <span className="adm-order__type">{o.type === 'delivery' ? <><TruckIcon size={14} /> Delivery</> : <><StoreIcon size={14} /> Mesa {o.table}</>}</span>
        <span className={`lx-badge lx-badge--${st.tone}`}>{st.label}</span>
        <small className="adm-order__time">{ago(o.createdAt)}</small>
      </header>
      <ul className="adm-order__items">
        {o.items.map((i, n) => (
          <li key={`${i.itemId}:${n}`}><span>{i.qty}×</span> {tr(i.name, context.language)} <em>{BRL(i.total)}</em></li>
        ))}
      </ul>
      {o.notes && <p className="adm-order__notes">“{o.notes}”</p>}
      {o.createdBy && <p className="adm-order__line"><StoreIcon size={13} /> Lançado por {o.createdBy}</p>}
      {o.type === 'delivery' && (o.name || o.phone) && (
        <p className="adm-order__line"><PhoneIcon size={13} /> {o.name}{o.phone && <> · <a href={`tel:${o.phone.replace(/[^\d+]/g, '')}`}>{o.phone}</a></>}</p>
      )}
      {o.address && (
        <p className="adm-order__line"><MapPinIcon size={13} /> {[o.address.street, o.address.complement, o.address.district, o.address.city].filter(Boolean).join(', ')}{o.address.reference && ` (${o.address.reference})`}</p>
      )}
      <div className="adm-order__total">
        <span>
          {PAYMENT[o.paymentMethod]}
          {o.cardLast4 && ` · ${BRAND_NAMES[o.cardBrand] ?? 'Cartão'} ${o.cardLast4}`}
          {o.coupon && ` · cupom ${o.coupon}`}
          {o.discount > 0 && ` · −${BRL(o.discount)}`}
        </span>
        <strong>{BRL(o.total)}</strong>
      </div>
      {open && (
        <div className="adm-actions">
          {next && <button type="button" className="lx-btn lx-btn--primary lx-btn--sm" onClick={() => act(`restaurant/orders/${o.id}/status`, { status: next.status })}>{next.label}</button>}
          <button type="button" className="lx-btn lx-btn--plain lx-btn--sm adm-danger-text" onClick={() => window.confirm(`Cancelar o pedido #${o.number}?`) && act(`restaurant/orders/${o.id}/status`, { status: 'canceled' })}>Cancelar</button>
        </div>
      )}
      {o.status === 'canceled' && o.canceledBy === 'customer' && <p className="lx-hint" style={{ margin: 0 }}>Cancelado pelo cliente.</p>}
    </article>
  );
}

export default function OrdersPage() {
  const { refreshActivity, showToast, can } = useOps();
  const [scope, setScope] = useState('active');
  const [type, setType] = useState('all');
  const [data, setData] = useState({ status: 'loading', orders: [], calls: [] });

  const load = useCallback(() => {
    api
      .get(`restaurant/orders?scope=${scope}`)
      .then((d) => setData({ status: 'ready', ...d }))
      .catch((err) => setData((prev) => ({ ...prev, status: 'error', message: err.message })));
  }, [scope]);

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [load]);

  const act = async (path, body) => {
    try {
      await api.post(path, body);
      load();
      refreshActivity();
    } catch (err) {
      showToast(err.message);
    }
  };

  const orders = data.orders.filter((o) => type === 'all' || o.type === type);

  return (
    <div className="ops-page ops-page--wide">
      <header className="ops-head">
        <div>
          <h1>Pedidos</h1>
          <p className="ops-head__lead">Delivery e pedidos das mesas, do celular do cliente ou lançados pela equipe. Atualiza sozinho.</p>
        </div>
        <button type="button" className="lx-btn lx-btn--plain lx-btn--sm" onClick={load}><RotateIcon size={14} /> Atualizar</button>
      </header>

      <div className="ops-toolbar">
        <div className="lx-seg" role="group" aria-label="Período">
          <button type="button" aria-pressed={scope === 'active'} onClick={() => setScope('active')}>Em aberto</button>
          <button type="button" aria-pressed={scope === 'today'} onClick={() => setScope('today')}>Últimas 24h</button>
        </div>
        <div className="lx-seg" role="group" aria-label="Tipo">
          <button type="button" aria-pressed={type === 'all'} onClick={() => setType('all')}>Todos</button>
          <button type="button" aria-pressed={type === 'table'} onClick={() => setType('table')}>Salão</button>
          <button type="button" aria-pressed={type === 'delivery'} onClick={() => setType('delivery')}>Delivery</button>
        </div>
      </div>

      {data.calls.length > 0 && can('tables') && (
        <section className="ops-card ops-card--alert">
          <h2><BellIcon size={17} /> Mesas chamando</h2>
          <ul className="adm-calls">
            {data.calls.map((c) => (
              <li key={c.id}>
                <span className="adm-calls__icon"><BellIcon size={16} /></span>
                <span><strong>Mesa {c.table}</strong><small>{ago(c.createdAt)}</small></span>
                <button type="button" className="lx-btn lx-btn--secondary lx-btn--sm" onClick={() => act(`restaurant/calls/${c.id}/done`)}><CheckIcon size={14} /> Atendido</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.status === 'error' && <div className="lx-alert lx-alert--error"><AlertIcon size={18} />{data.message}</div>}
      {data.status === 'ready' && !orders.length && (
        <div className="adm-empty">
          <BagIcon size={22} />
          <strong>{scope === 'active' ? 'Nenhum pedido em aberto' : 'Nenhum pedido nas últimas 24h'}</strong>
          <span>Pedidos de delivery e das mesas aparecem aqui na hora.</span>
        </div>
      )}

      {scope === 'active' ? (
        orders.length > 0 && (
          <div className="ops-board">
            {COLUMNS.map((col) => {
              const list = orders.filter((o) => col.statuses.includes(o.status));
              return (
                <section key={col.id} className="ops-board__col">
                  <h2>{col.title} <span>{list.length}</span></h2>
                  <div className="adm-stack">
                    {list.map((o) => <OrderCard key={o.id} o={o} act={act} />)}
                    {!list.length && <p className="ops-board__empty">—</p>}
                  </div>
                </section>
              );
            })}
          </div>
        )
      ) : (
        <div className="ops-masonry">
          {orders.map((o) => <OrderCard key={o.id} o={o} act={act} />)}
        </div>
      )}
    </div>
  );
}
