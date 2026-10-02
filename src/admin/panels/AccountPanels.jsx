import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const { draft, update, setPanel } = useAdmin();
  const settings = draft.reservations;
  const select = (key, options) => (
    <select className="lx-select lx-select--sm" value={settings[key]} onChange={(e) => update(['reservations', key], Number(e.target.value))}>
      {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
  );

  return (
    <>
      <PanelHeader title="Reservas online" description="Como os clientes reservam pelo site. As reservas recebidas, a presença e a nota de cada cliente ficam no painel, em Reservas." />
      <Link to="/painel/reservas" className="adm-link-row">
        <span><strong>Ver reservas recebidas</strong><small>Chegou, não veio e cancelar ficam no painel.</small></span>
        <CalendarIcon size={18} />
      </Link>
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
        <span>O painel fica em <strong>{window.location.host}/painel</strong>: você entra com e-mail e senha, e a equipe pelos links em Colaboradores.</span>
      </div>
    </>
  );
}
