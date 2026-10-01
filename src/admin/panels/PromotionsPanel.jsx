import { useState } from 'react';
import { tr } from '../../../shared/i18n.js';
import { PROMO_TYPES, promoBadge, promoIsActive } from '../../../shared/pricing.js';
import { newId, nowInTimezone } from '../../../shared/site.js';
import { ChevronDownIcon, PlusIcon, TagIcon, TrashIcon } from '../../icons.jsx';
import { parseMoney } from '../../site/editable.jsx';
import { Switch } from '../../ui.jsx';
import { useAdmin } from '../AdminContext.jsx';
import { PanelHeader, TField } from '../fields.jsx';

const BRL = (cents) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const TYPE_HINT = {
  all: 'Desconto no total do pedido (delivery e mesa). Sem cupom, vale automaticamente.',
  items: 'Desconto só nos pratos escolhidos. Sem cupom, o preço promocional aparece direto no cardápio.',
  reservation: 'Quem reservar pelo site ganha o benefício para usar no restaurante, no que consumir.',
};

function ValueInput({ promo, index }) {
  const { update } = useAdmin();
  const [text, setText] = useState(null);
  const percent = promo.discountType === 'percent';
  const shown = text ?? (percent ? String(promo.value) : (promo.value / 100).toFixed(2).replace('.', ','));
  return (
    <input
      className="lx-input"
      inputMode="decimal"
      aria-label="Valor do desconto"
      value={shown}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text !== null) {
          const value = percent ? Math.min(100, Math.max(1, Math.round(Number(text.replace(',', '.')) || 0))) : parseMoney(text);
          update(['promotions', index, 'value'], value);
        }
        setText(null);
      }}
    />
  );
}

function PromoEditor({ promo, index }) {
  const { draft, update, editLang } = useAdmin();
  const path = ['promotions', index];
  const set = (key) => (value) => update([...path, key], value);
  const toggleItem = (id) => set('itemIds')(promo.itemIds.includes(id) ? promo.itemIds.filter((x) => x !== id) : [...promo.itemIds, id]);
  const toggleDay = (d) => set('weekdays')(promo.weekdays.includes(d) ? promo.weekdays.filter((x) => x !== d) : [...promo.weekdays, d].sort());

  return (
    <div className="adm-promo__editor">
      <TField path={[...path, 'title']} label="Nome da promoção" max={80} placeholder="Ex.: Terça da massa" />
      <TField path={[...path, 'description']} label="Descrição" multiline max={300} placeholder="Ex.: 20% em todas as massas às terças." />

      <div className="lx-field">
        <span className="lx-label">Vale para</span>
        <div className="lx-seg adm-seg-wrap">
          {Object.entries(PROMO_TYPES).map(([type, label]) => (
            <button key={type} type="button" aria-pressed={promo.type === type} onClick={() => set('type')(type)}>{label}</button>
          ))}
        </div>
        <span className="lx-hint">{TYPE_HINT[promo.type]}</span>
      </div>

      {promo.type === 'items' && (
        <div className="lx-field">
          <span className="lx-label">Pratos com desconto ({promo.itemIds.length})</span>
          <ul className="adm-checklist-items">
            {draft.menu.items.map((item) => (
              <li key={item.id}>
                <label>
                  <input type="checkbox" checked={promo.itemIds.includes(item.id)} onChange={() => toggleItem(item.id)} />
                  <span>{tr(item.name, editLang, draft.defaultLanguage) || 'Prato sem nome'}</span>
                  <small>{BRL(item.price)}</small>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {promo.type === 'reservation' && (
        <div className="lx-field">
          <label className="lx-label" htmlFor={`adv-${promo.id}`}>Antecedência mínima da reserva (horas)</label>
          <input id={`adv-${promo.id}`} type="number" min={0} max={720} className="lx-input" value={promo.minAdvanceHours} onChange={(e) => set('minAdvanceHours')(Math.max(0, Math.min(720, Number(e.target.value) || 0)))} />
          <span className="lx-hint">Ex.: 24 = só ganha quem reserva com um dia de antecedência.</span>
        </div>
      )}

      <div className="lx-row">
        <div className="lx-field">
          <span className="lx-label">Desconto</span>
          <div className="lx-seg">
            <button type="button" aria-pressed={promo.discountType === 'percent'} onClick={() => update(path, { ...promo, discountType: 'percent', value: 10 })}>%</button>
            <button type="button" aria-pressed={promo.discountType === 'fixed'} onClick={() => update(path, { ...promo, discountType: 'fixed', value: 1000 })}>R$</button>
          </div>
        </div>
        <div className="lx-field">
          <span className="lx-label">{promo.discountType === 'percent' ? 'Porcentagem' : 'Valor (R$)'}</span>
          <ValueInput key={promo.discountType} promo={promo} index={index} />
        </div>
      </div>

      <div className="lx-field">
        <label className="lx-label" htmlFor={`code-${promo.id}`}>Cupom <span className="opt">(opcional)</span></label>
        <input id={`code-${promo.id}`} className="lx-input adm-code" maxLength={24} placeholder="Ex.: MASSA20" value={promo.code} onChange={(e) => set('code')(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} />
        <span className="lx-hint">
          {promo.type === 'reservation' ? 'Mostrado ao cliente depois da reserva para apresentar no restaurante.' : 'Com cupom, o desconto só vale para quem digitar o código no carrinho.'}
        </span>
      </div>

      <div className="lx-row">
        <div className="lx-field">
          <label className="lx-label" htmlFor={`start-${promo.id}`}>Começa em <span className="opt">(opcional)</span></label>
          <input id={`start-${promo.id}`} type="date" className="lx-input" value={promo.start} onChange={(e) => set('start')(e.target.value)} />
        </div>
        <div className="lx-field">
          <label className="lx-label" htmlFor={`end-${promo.id}`}>Termina em <span className="opt">(opcional)</span></label>
          <input id={`end-${promo.id}`} type="date" className="lx-input" value={promo.end} min={promo.start || undefined} onChange={(e) => set('end')(e.target.value)} />
        </div>
      </div>

      <div className="lx-field">
        <span className="lx-label">Dias da semana <span className="opt">(nenhum = todos)</span></span>
        <div className="adm-days">
          {DAYS.map((d, i) => (
            <button key={i} type="button" aria-pressed={promo.weekdays.includes(i)} title={DAY_NAMES[i]} onClick={() => toggleDay(i)}>{d}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PromotionsPanel() {
  const { draft, update, editLang } = useAdmin();
  const promos = draft.promotions ?? [];
  const [open, setOpen] = useState(null);
  const today = nowInTimezone().date;

  const add = () => {
    const promo = {
      id: newId(), active: true, title: { [editLang]: 'Nova promoção' }, description: {}, type: 'all', itemIds: [],
      discountType: 'percent', value: 10, code: '', start: '', end: '', weekdays: [], minAdvanceHours: 0,
    };
    update(['promotions'], [...promos, promo]);
    setOpen(promo.id);
  };
  const remove = (promo) => {
    if (window.confirm(`Excluir a promoção "${tr(promo.title, editLang, draft.defaultLanguage) || 'sem nome'}"?`)) {
      update(['promotions'], promos.filter((p) => p.id !== promo.id));
    }
  };

  return (
    <>
      <PanelHeader title="Promoções" description="Descontos para o cardápio todo, para pratos específicos ou para quem reservar antes. Aparecem numa seção própria do site." />
      <div className="adm-stack">
        {!promos.length && (
          <div className="adm-empty">
            <TagIcon size={22} />
            <strong>Nenhuma promoção ainda</strong>
            <span>Crie a primeira para atrair clientes nos dias mais fracos.</span>
          </div>
        )}
        {promos.map((promo, i) => {
          const live = promoIsActive(promo, today);
          return (
            <section key={promo.id} className={`adm-promo ${open === promo.id ? 'is-open' : ''}`}>
              <div className="adm-promo__head">
                <button type="button" className="adm-promo__main" onClick={() => setOpen(open === promo.id ? null : promo.id)} aria-expanded={open === promo.id}>
                  <span className="adm-promo__badge">{promoBadge(promo, BRL)}</span>
                  <span className="adm-promo__text">
                    <strong>{tr(promo.title, editLang, draft.defaultLanguage) || 'Promoção sem nome'}</strong>
                    <small>
                      {PROMO_TYPES[promo.type]}
                      {promo.code ? ` · cupom ${promo.code}` : ''}
                      {' · '}
                      <span className={live ? 'adm-ok-text' : 'adm-muted-text'}>{live ? 'no ar' : promo.active ? 'fora da validade' : 'pausada'}</span>
                    </small>
                  </span>
                  <ChevronDownIcon size={18} className="adm-promo__chevron" />
                </button>
                <Switch checked={promo.active} onChange={(v) => update(['promotions', i, 'active'], v)} label="Promoção ativa" />
                <button type="button" className="lx-btn lx-btn--plain lx-btn--icon adm-danger-text" title="Excluir" onClick={() => remove(promo)}><TrashIcon size={16} /></button>
              </div>
              {open === promo.id && <PromoEditor promo={promo} index={i} />}
            </section>
          );
        })}
        <button type="button" className="lx-btn lx-btn--secondary" onClick={add}><PlusIcon size={16} /> Nova promoção</button>
      </div>
    </>
  );
}
