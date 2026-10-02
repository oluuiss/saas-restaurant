import { useState } from 'react';
import { Link } from 'react-router-dom';
import { allTables } from '../../../shared/floor.js';
import { tr } from '../../../shared/i18n.js';
import { siteUrl } from '../../../shared/slug.js';
import { AlertIcon, CopyIcon, ExternalIcon, LayoutIcon, PrinterIcon } from '../../icons.jsx';
import { parseMoney } from '../../site/editable.jsx';
import { Switch } from '../../ui.jsx';
import { useAdmin } from '../AdminContext.jsx';
import { PanelHeader, Section } from '../fields.jsx';

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

      {tables.length > 0 && (
        <Link to="/painel/mesas/qrcodes" className="adm-link-row">
          <span><strong>Imprimir QR Codes das mesas</strong><small>O cliente escaneia para pedir e chamar o garçom; a equipe escaneia para ocupar a mesa e fechar a conta.</small></span>
          <PrinterIcon size={18} />
        </Link>
      )}
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
