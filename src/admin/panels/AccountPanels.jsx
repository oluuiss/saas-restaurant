import { useCallback, useEffect, useState } from 'react';
import { PLANS, formatBRL } from '../../../shared/plans.js';
import { BRAND_NAMES } from '../../../shared/payments.js';
import { eventTime } from '../../../shared/policy.js';
import { isValidSlug, siteLabel, siteUrl, slugify } from '../../../shared/slug.js';
import { allTables } from '../../../shared/floor.js';
import { api } from '../../lib/api.js';
import { AlertIcon, CalendarIcon, CheckIcon, CopyIcon, ExternalIcon, GlobeIcon, LockIcon, PhoneIcon, RotateIcon, StarIcon, UsersIcon } from '../../icons.jsx';
import { Field, Switch } from '../../ui.jsx';
import { useAdmin } from '../AdminContext.jsx';
import { PanelHeader, Section } from '../fields.jsx';

const dateLabel = (iso, today) => {
  if (iso === today) return 'Hoje';
  const label = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
  return label;
};
const fullDate = (value) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value));

const STATUS = {
  confirmed: ['Confirmada', 'info'],
  attended: ['Compareceu', 'success'],
  no_show: ['Não veio', 'danger'],
  canceled: ['Cancelada', 'muted'],
};

export function ReservationsPanel() {
  const { draft, update, setPanel, showToast } = useAdmin();
  const [state, setState] = useState({ status: 'loading', list: [], today: '' });
  const settings = draft.reservations;

  const load = useCallback(() => {
    api
      .get('restaurant/reservations')
      .then(({ reservations, today }) => setState({ status: 'ready', list: reservations, today }))
      .catch((err) => setState({ status: 'error', list: [], message: err.message }));
  }, []);
  useEffect(load, [load]);

  const setStatus = async (r, status, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      await api.post(`restaurant/reservations/${r.id}/status`, { status });
      load();
    } catch (err) {
      showToast(err.message);
    }
  };

  const groups = state.list.reduce((acc, r) => {
    (acc[r.date] ??= []).push(r);
    return acc;
  }, {});
  const select = (key, options) => (
    <select className="lx-select lx-select--sm" value={settings[key]} onChange={(e) => update(['reservations', key], Number(e.target.value))}>
      {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
  );

  return (
    <>
      <PanelHeader title="Reservas" description="Quem reservou, a nota de cada cliente e a presença. Marcar quem compareceu ou não veio atualiza a nota dele." />
      <Section title="Próximas reservas" aside={<button type="button" className="lx-btn lx-btn--plain lx-btn--sm" onClick={load}><RotateIcon size={14} /> Atualizar</button>}>
        {state.status === 'loading' && <p className="lx-hint">Carregando…</p>}
        {state.status === 'error' && <div className="lx-alert lx-alert--error"><AlertIcon size={18} />{state.message}</div>}
        {state.status === 'ready' && !state.list.length && (
          <div className="adm-empty">
            <CalendarIcon size={22} />
            <strong>Nenhuma reserva ainda</strong>
            <span>Quando seus clientes reservarem pelo site publicado, elas aparecem aqui.</span>
          </div>
        )}
        {Object.entries(groups).map(([date, list]) => (
          <div key={date} className="adm-res-day">
            <h4>{dateLabel(date, state.today)}</h4>
            <ul className="adm-res">
              {list.map((r) => {
                const started = eventTime(r.date, r.time) <= Date.now();
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
                          <button type="button" className="lx-btn lx-btn--secondary lx-btn--sm" onClick={() => setStatus(r, 'attended')}><CheckIcon size={13} /> Veio</button>
                          <button type="button" className="lx-btn lx-btn--plain lx-btn--sm adm-danger-text" onClick={() => setStatus(r, 'no_show', `Marcar que ${r.name} não veio? A nota do cliente cai.`)}>Não veio</button>
                        </span>
                      )}
                      {r.status === 'confirmed' && !started && (
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
          </div>
        ))}
      </Section>

      <Section title="Configurações">
        <label className="adm-toggle">
          <span><strong>Reservas online</strong><small>Mostra o mapa do salão para o cliente escolher a mesa.</small></span>
          <Switch checked={settings.enabled} onChange={(v) => update(['reservations', 'enabled'], v)} label="Reservas online" />
        </label>
        <div className="lx-row">
          <div className="lx-field"><span className="lx-label">Duração de cada reserva</span>{select('durationMinutes', [[60, '1 hora'], [90, '1h30'], [120, '2 horas'], [150, '2h30'], [180, '3 horas']])}</div>
          <div className="lx-field"><span className="lx-label">Intervalo entre horários</span>{select('slotMinutes', [[15, '15 min'], [30, '30 min'], [60, '1 hora']])}</div>
        </div>
        <div className="lx-field"><span className="lx-label">Reservas com até</span>{select('daysAhead', [[7, '7 dias de antecedência'], [14, '14 dias de antecedência'], [30, '30 dias de antecedência'], [60, '60 dias de antecedência'], [90, '90 dias de antecedência']])}</div>
        <p className="lx-hint" style={{ margin: 0 }}>
          Os horários seguem o <button type="button" className="adm-link" onClick={() => setPanel('horarios')}>horário de funcionamento</button>. {allTables(draft).length} mesas na <button type="button" className="adm-link" onClick={() => setPanel('planta')}>planta</button>.
        </p>
      </Section>

      <div className="lx-alert lx-alert--info">
        <StarIcon size={18} />
        <span>
          <strong>Nota do cliente (0 a 5):</strong> calculada separadamente para reservas e pedidos e depois tirada a média.
          Cada cancelamento ou falta tira 1 ponto, diluído pelas vezes que o cliente compareceu.
          O cliente pode cancelar até 2h antes; se reservou em cima da hora, tem 30 min (e nunca nos últimos 30 min).
        </span>
      </div>
    </>
  );
}

export function DomainPanel() {
  const { meta, setMeta, draft, showToast } = useAdmin();
  const [slug, setSlug] = useState(meta.slug);
  const [check, setCheck] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const url = siteUrl(meta.slug);
  const changed = slug !== meta.slug;

  useEffect(() => {
    if (!changed) {
      setCheck(null);
      return undefined;
    }
    if (!isValidSlug(slug)) {
      setCheck({ valid: false });
      return undefined;
    }
    const timer = setTimeout(() => {
      api.get(`restaurant/slug-check?slug=${encodeURIComponent(slug)}`).then(setCheck).catch(() => setCheck(null));
    }, 350);
    return () => clearTimeout(timer);
  }, [slug, changed]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await api.put('restaurant/slug', { slug });
      setMeta((m) => ({ ...m, ...updated }));
      showToast('Endereço atualizado.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const copy = (text) => {
    navigator.clipboard?.writeText(text);
    showToast('Link copiado.');
  };

  return (
    <>
      <PanelHeader title="Endereço do site" description="Seu site fica numa “pasta” do Lumenu. É esse o link que você divulga para os clientes." />
      <div className="adm-domain">
        <span className="adm-domain__icon"><GlobeIcon size={22} /></span>
        <span className="adm-domain__url">{siteLabel(meta.slug)}</span>
        <span className={`lx-badge ${meta.publishedAt ? 'lx-badge--success' : 'lx-badge--warning'}`}>
          {meta.publishedAt ? 'Publicado' : 'Ainda não publicado'}
        </span>
        <div className="adm-domain__actions">
          <button type="button" className="lx-btn lx-btn--secondary lx-btn--sm" onClick={() => copy(url)}><CopyIcon size={15} /> Copiar</button>
          {meta.publishedAt && (
            <a className="lx-btn lx-btn--secondary lx-btn--sm" href={url} target="_blank" rel="noopener noreferrer"><ExternalIcon size={15} /> Abrir</a>
          )}
        </div>
      </div>

      <Section title="Personalizar endereço">
        <Field id="slug" label="Nome da pasta" hint="Letras minúsculas, números e hífens." error={changed && check && !check.valid ? 'Use de 2 a 40 letras minúsculas, números e hífens (alguns nomes são reservados).' : changed && check?.valid && !check.available ? 'Esse endereço já está em uso.' : error}>
          <div className="adm-slug">
            <span>{window.location.host}/</span>
            <input id="slug" className="lx-input lx-input--sm" value={slug} maxLength={40} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
          </div>
        </Field>
        <div className="adm-actions">
          <button type="button" className="lx-btn lx-btn--primary lx-btn--sm" disabled={!changed || !check?.available || saving} onClick={save}>
            {saving ? 'Salvando…' : 'Salvar endereço'}
          </button>
          {slugify(draft.brand.name) && slugify(draft.brand.name) !== slug && (
            <button type="button" className="lx-btn lx-btn--plain lx-btn--sm" onClick={() => setSlug(slugify(draft.brand.name))}>Usar o nome do restaurante</button>
          )}
        </div>
        {meta.publishedAt && changed && <p className="lx-hint" style={{ margin: 0 }}>O endereço antigo deixa de funcionar quando você salvar.</p>}
      </Section>

      <div className="lx-alert lx-alert--info">
        <LockIcon size={18} />
        <span>Seu painel fica em <strong>{window.location.host}/painel</strong> e só abre com o seu e-mail e senha.</span>
      </div>
    </>
  );
}

export function BillingPanel() {
  const [state, setState] = useState({ status: 'loading' });
  useEffect(() => {
    api.get('restaurant/billing').then((data) => setState({ status: 'ready', ...data })).catch((err) => setState({ status: 'error', message: err.message }));
  }, []);

  if (state.status !== 'ready') {
    return (
      <>
        <PanelHeader title="Assinatura" />
        {state.status === 'error' ? <div className="lx-alert lx-alert--error"><AlertIcon size={18} />{state.message}</div> : <p className="lx-hint">Carregando…</p>}
      </>
    );
  }

  const { subscription, payments } = state;
  const plan = PLANS[subscription?.plan];
  return (
    <>
      <PanelHeader title="Assinatura" description="Seu plano, a próxima cobrança e o histórico de pagamentos." />
      {subscription && (
        <div className="adm-plan">
          <small>Plano atual</small>
          <strong>{plan?.name ?? subscription.plan}</strong>
          <span>{formatBRL(subscription.priceCents)}/mês</span>
          <span className="lx-badge lx-badge--success"><CheckIcon size={12} /> {subscription.status === 'active' ? 'Ativa' : subscription.status}</span>
          <p>Renova em {fullDate(subscription.currentPeriodEnd)} (todo mês, a partir da data do pagamento).</p>
        </div>
      )}
      <Section title="Pagamentos">
        <ul className="adm-payments">
          {payments.map((p, i) => (
            <li key={i}>
              <span>
                <strong>{formatBRL(p.amountCents)}</strong>
                <small>{fullDate(p.createdAt)} · {p.method === 'pix' ? 'Pix' : `${BRAND_NAMES[p.brand] ?? 'Cartão'} final ${p.last4}`}</small>
              </span>
              <span className={`lx-badge ${p.status === 'approved' ? 'lx-badge--success' : 'lx-badge--danger'}`}>{p.status === 'approved' ? 'Aprovado' : 'Recusado'}</span>
            </li>
          ))}
        </ul>
        <p className="lx-hint" style={{ margin: 0 }}>Gateway de exemplo: nenhuma cobrança real foi feita.</p>
      </Section>
      <p className="lx-hint">Quer mudar de plano ou incluir o cardápio no tablet? <a href="/#contato" target="_blank" rel="noopener">Fale com a gente</a>.</p>
    </>
  );
}
