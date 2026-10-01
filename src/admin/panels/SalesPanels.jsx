import { useCallback, useEffect, useState } from 'react';
import { allTables } from '../../../shared/floor.js';
import { tr } from '../../../shared/i18n.js';
import { BRAND_NAMES } from '../../../shared/payments.js';
import { siteUrl } from '../../../shared/slug.js';
import { api } from '../../lib/api.js';
import { AlertIcon, BagIcon, BellIcon, CheckIcon, CopyIcon, ExternalIcon, LayoutIcon, MapPinIcon, PhoneIcon, RotateIcon, StoreIcon, TruckIcon } from '../../icons.jsx';
import { parseMoney } from '../../site/editable.jsx';
import { Switch } from '../../ui.jsx';
import { useAdmin } from '../AdminContext.jsx';
import { PanelHeader, Section } from '../fields.jsx';

const BRL = (cents) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents ?? 0) / 100);

function ago(value) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `há ${hours}h${String(minutes % 60).padStart(2, '0')}`;
}

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

const PAYMENT = { on_delivery: 'Pagar na entrega', online: 'Pago online', at_table: 'Pagar na mesa' };

export function OrdersPanel() {
  const { draft, refreshActivity, showToast } = useAdmin();
  const [scope, setScope] = useState('active');
  const [data, setData] = useState({ status: 'loading', orders: [], calls: [] });

  const load = useCallback(() => {
    api
      .get(`restaurant/orders?scope=${scope}`)
      .then((d) => setData({ status: 'ready', ...d }))
      .catch((err) => setData({ status: 'error', orders: [], calls: [], message: err.message }));
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

  const name = (field) => tr(field, draft.defaultLanguage);

  return (
    <>
      <PanelHeader title="Pedidos e chamados" description="Pedidos de delivery, pedidos feitos pelas mesas e mesas chamando atendente. Atualiza sozinho." />
      <div className="lx-seg" role="group">
        <button type="button" aria-pressed={scope === 'active'} onClick={() => setScope('active')}>Em aberto</button>
        <button type="button" aria-pressed={scope === 'today'} onClick={() => setScope('today')}>Últimas 24h</button>
      </div>

      {data.calls.length > 0 && (
        <Section title="Mesas chamando">
          <ul className="adm-calls">
            {data.calls.map((c) => (
              <li key={c.id}>
                <span className="adm-calls__icon"><BellIcon size={16} /></span>
                <span><strong>Mesa {c.table}</strong><small>{ago(c.createdAt)}</small></span>
                <button type="button" className="lx-btn lx-btn--secondary lx-btn--sm" onClick={() => act(`restaurant/calls/${c.id}/done`)}><CheckIcon size={14} /> Atendido</button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {data.status === 'error' && <div className="lx-alert lx-alert--error"><AlertIcon size={18} />{data.message}</div>}
      {data.status === 'ready' && !data.orders.length && (
        <div className="adm-empty">
          <BagIcon size={22} />
          <strong>{scope === 'active' ? 'Nenhum pedido em aberto' : 'Nenhum pedido nas últimas 24h'}</strong>
          <span>Pedidos de delivery e das mesas aparecem aqui na hora.</span>
        </div>
      )}

      <div className="adm-stack">
        {data.orders.map((o) => {
          const next = nextStep(o);
          const st = STATUS[o.status];
          return (
            <article key={o.id} className={`adm-order is-${o.status}`}>
              <header className="adm-order__head">
                <span className="adm-order__num">#{o.number}</span>
                <span className="adm-order__type">{o.type === 'delivery' ? <><TruckIcon size={14} /> Delivery</> : <><StoreIcon size={14} /> Mesa {o.table}</>}</span>
                <span className={`lx-badge lx-badge--${st.tone}`}>{st.label}</span>
                <small className="adm-order__time">{ago(o.createdAt)}</small>
              </header>
              <ul className="adm-order__items">
                {o.items.map((i) => (
                  <li key={i.itemId}><span>{i.qty}×</span> {name(i.name)} <em>{BRL(i.total)}</em></li>
                ))}
              </ul>
              {o.notes && <p className="adm-order__notes">“{o.notes}”</p>}
              {(o.name || o.phone) && (
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
              {(next || !['delivered', 'canceled'].includes(o.status)) && (
                <div className="adm-actions">
                  {next && <button type="button" className="lx-btn lx-btn--primary lx-btn--sm" onClick={() => act(`restaurant/orders/${o.id}/status`, { status: next.status })}>{next.label}</button>}
                  {!['delivered', 'canceled'].includes(o.status) && (
                    <button type="button" className="lx-btn lx-btn--plain lx-btn--sm adm-danger-text" onClick={() => window.confirm(`Cancelar o pedido #${o.number}?`) && act(`restaurant/orders/${o.id}/status`, { status: 'canceled' })}>Cancelar</button>
                  )}
                </div>
              )}
              {o.status === 'canceled' && o.canceledBy === 'customer' && <p className="lx-hint" style={{ margin: 0 }}>Cancelado pelo cliente.</p>}
            </article>
          );
        })}
      </div>
      <button type="button" className="lx-btn lx-btn--plain lx-btn--sm" onClick={load}><RotateIcon size={14} /> Atualizar agora</button>
    </>
  );
}

function MoneyField({ label, path, hint }) {
  const { draft, update } = useAdmin();
  const cents = path.reduce((n, k) => n?.[k], draft) ?? 0;
  const [text, setText] = useState(null);
  return (
    <div className="lx-field">
      <span className="lx-label">{label}</span>
      <div className="adm-money">
        <span>R$</span>
        <input
          className="lx-input"
          inputMode="decimal"
          value={text ?? (cents / 100).toFixed(2).replace('.', ',')}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            if (text !== null) update(path, parseMoney(text));
            setText(null);
          }}
        />
      </div>
      {hint && <span className="lx-hint">{hint}</span>}
    </div>
  );
}

export function DeliveryPanel() {
  const { draft, update } = useAdmin();
  const d = draft.delivery;
  const number = (key, min, max) => (
    <input type="number" className="lx-input" min={min} max={max} value={d[key]} onChange={(e) => update(['delivery', key], Math.max(min, Math.min(max, Number(e.target.value) || min)))} />
  );
  return (
    <>
      <PanelHeader title="Delivery" description="O cliente monta o pedido no seu site, entra na conta dele e acompanha o andamento em Minha conta." />
      <Section>
        <label className="adm-toggle">
          <span><strong>Aceitar pedidos de delivery</strong><small>Mostra o carrinho e o botão “Pedir delivery” no site.</small></span>
          <Switch checked={d.enabled} onChange={(v) => update(['delivery', 'enabled'], v)} label="Aceitar pedidos de delivery" />
        </label>
      </Section>
      <Section title="Valores">
        <MoneyField label="Taxa de entrega" path={['delivery', 'fee']} />
        <div className="lx-row">
          <MoneyField label="Pedido mínimo" path={['delivery', 'minOrder']} hint="0 = sem mínimo" />
          <MoneyField label="Entrega grátis acima de" path={['delivery', 'freeAbove']} hint="0 = nunca grátis" />
        </div>
      </Section>
      <Section title="Tempo estimado (minutos)">
        <div className="lx-row">
          <div className="lx-field"><span className="lx-label">De</span>{number('estimateMin', 5, 240)}</div>
          <div className="lx-field"><span className="lx-label">Até</span>{number('estimateMax', 5, 300)}</div>
        </div>
      </Section>
      <Section title="Formas de pagamento">
        <label className="adm-toggle">
          <span><strong>Pagar na entrega</strong><small>Dinheiro, cartão ou Pix na hora.</small></span>
          <Switch checked={d.payOnDelivery} onChange={(v) => update(['delivery', 'payOnDelivery'], v || !d.payOnline)} label="Pagar na entrega" />
        </label>
        <label className="adm-toggle">
          <span><strong>Cartão online</strong><small>Pelo gateway de exemplo (cartões de teste).</small></span>
          <Switch checked={d.payOnline} onChange={(v) => update(['delivery', 'payOnline'], v || !d.payOnDelivery)} label="Cartão online" />
        </label>
      </Section>
    </>
  );
}

export function TablesPanel() {
  const { draft, update, change, meta, setPanel, showToast } = useAdmin();
  const ts = draft.tableService;
  const tables = allTables(draft);

  const rename = (table, label) =>
    change((d) => ({
      ...d,
      floors: d.floors.map((f) => (f.id !== table.floorId ? f : { ...f, elements: f.elements.map((el) => (el.id === table.id ? { ...el, label } : el)) })),
    }), `table-label:${table.id}`);

  const labels = tables.map((t) => t.label.trim().toUpperCase());
  const duplicated = new Set(labels.filter((l, i) => labels.indexOf(l) !== i));
  const link = (table) => `${siteUrl(meta.slug)}/mesa/${encodeURIComponent(table.label)}`;

  return (
    <>
      <PanelHeader title="Mesas" description="No site, o cliente toca em “Estou no restaurante”, informa o número da mesa e pode chamar um atendente ou pedir pelo cardápio." />
      <Section title="Atendimento pela mesa">
        <label className="adm-toggle">
          <span><strong>Botão “Estou no restaurante”</strong><small>Aparece logo abaixo do cardápio.</small></span>
          <Switch checked={ts.enabled} onChange={(v) => update(['tableService', 'enabled'], v)} label="Atendimento pela mesa" />
        </label>
        {ts.enabled && (
          <>
            <label className="adm-toggle">
              <span><strong>Chamar atendente</strong><small>Você recebe o aviso em Pedidos e chamados.</small></span>
              <Switch checked={ts.call} onChange={(v) => update(['tableService', 'call'], v)} label="Chamar atendente" />
            </label>
            <label className="adm-toggle">
              <span><strong>Pedir pelo celular</strong><small>O pedido chega com o número da mesa.</small></span>
              <Switch checked={ts.orders} onChange={(v) => update(['tableService', 'orders'], v)} label="Pedir pelo celular" />
            </label>
          </>
        )}
      </Section>

      <Section title={`Números das mesas (${tables.length})`} aside={<button type="button" className="lx-btn lx-btn--plain lx-btn--sm" onClick={() => setPanel('planta')}><LayoutIcon size={14} /> Planta</button>}>
        {!tables.length ? (
          <p className="lx-hint" style={{ margin: 0 }}>Desenhe as mesas na planta do salão para elas aparecerem aqui.</p>
        ) : (
          <ul className="adm-tables">
            {tables.map((table) => {
              const floor = draft.floors.find((f) => f.id === table.floorId);
              const dup = duplicated.has(table.label.trim().toUpperCase());
              return (
                <li key={table.id} className={dup ? 'is-dup' : ''}>
                  <input className="lx-input lx-input--sm" value={table.label} maxLength={8} aria-label="Número da mesa" onChange={(e) => rename(table, e.target.value)} />
                  <span className="adm-tables__info">{table.seats} lugares · {tr(floor?.name, draft.defaultLanguage)}</span>
                  <button type="button" className="lx-btn lx-btn--plain lx-btn--icon" title="Copiar link da mesa (para QR Code)" onClick={() => { navigator.clipboard?.writeText(link(table)); showToast('Link da mesa copiado.'); }}><CopyIcon size={15} /></button>
                  {meta.publishedAt && <a className="lx-btn lx-btn--plain lx-btn--icon" href={link(table)} target="_blank" rel="noopener noreferrer" title="Abrir como cliente"><ExternalIcon size={15} /></a>}
                </li>
              );
            })}
          </ul>
        )}
        {duplicated.size > 0 && <div className="lx-alert lx-alert--warning"><AlertIcon size={18} />Há mesas com o mesmo número. Cada mesa precisa de um número único.</div>}
        <p className="lx-hint" style={{ margin: 0 }}>O cliente pode digitar “M12” ou só “12”. O link de cada mesa abre o site já na mesa certa (ótimo para um QR Code na plaquinha).</p>
      </Section>
    </>
  );
}
