import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PLANS, formatBRL } from '../../shared/plans.js';
import { BRAND_NAMES } from '../../shared/payments.js';
import { api } from '../lib/api.js';
import { uploadImage } from '../lib/images.js';
import { AlertIcon, ArrowLeftIcon, CameraIcon, CardIcon, CheckIcon, LockIcon, StoreIcon, UsersIcon } from '../icons.jsx';
import { Field, LumenuMark } from '../ui.jsx';
import { useAdmin } from './AdminContext.jsx';

const fullDate = (value) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value));

function Card({ icon: Icon, title, description, children }) {
  return (
    <section className="set-card">
      <header className="set-card__head">
        <span className="set-card__icon"><Icon size={18} /></span>
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function ProfileAndCompany() {
  const { account, setAccount, showToast } = useAdmin();
  const [form, setForm] = useState({
    name: account.name, email: account.email, phone: account.phone ?? '', avatarUrl: account.avatarUrl ?? null,
    company: { tradeName: '', legalName: '', document: '', phone: '', address: '', city: '', ...account.company },
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const file = useRef(null);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const setCompany = (key) => (e) => setForm({ ...form, company: { ...form.company, [key]: e.target.value } });

  const pickAvatar = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setUploading(true);
    try {
      setForm((v) => ({ ...v, avatarUrl: null }));
      const url = await uploadImage(f, { max: 320, square: true });
      setForm((v) => ({ ...v, avatarUrl: url }));
    } catch (err) {
      showToast(err.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const data = await api.put('account', form);
      setAccount(data.account);
      showToast('Dados salvos.');
    } catch (err) {
      setErrors(err.fields ?? {});
      showToast(err.message);
    } finally {
      setSaving(false);
    }
  };

  const initials = form.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <form onSubmit={save} className="set-stack">
      <Card icon={UsersIcon} title="Meu perfil" description="Seus dados de acesso ao painel.">
        <div className="set-avatar">
          <span className="set-avatar__img">
            {form.avatarUrl ? <img src={form.avatarUrl} alt="" /> : initials}
            {uploading && <span className="adm-image__busy"><span className="lx-spinner lx-spinner--blue" /></span>}
          </span>
          <div className="set-avatar__actions">
            <button type="button" className="lx-btn lx-btn--secondary lx-btn--sm" onClick={() => file.current?.click()} disabled={uploading}>
              <CameraIcon size={15} /> {form.avatarUrl ? 'Trocar foto' : 'Enviar foto'}
            </button>
            {form.avatarUrl && <button type="button" className="lx-btn lx-btn--plain lx-btn--sm adm-danger-text" onClick={() => setForm({ ...form, avatarUrl: null })}>Remover</button>}
            <input ref={file} type="file" accept="image/*" hidden onChange={pickAvatar} />
          </div>
        </div>
        <div className="set-grid">
          <Field id="set-name" label="Nome" error={errors.name}><input id="set-name" className="lx-input" value={form.name} onChange={set('name')} autoComplete="name" /></Field>
          <Field id="set-email" label="E-mail" error={errors.email}><input id="set-email" type="email" className="lx-input" value={form.email} onChange={set('email')} autoComplete="email" /></Field>
          <Field id="set-phone" label="Celular" optional><input id="set-phone" type="tel" className="lx-input" value={form.phone} onChange={set('phone')} autoComplete="tel" /></Field>
        </div>
      </Card>

      <Card icon={StoreIcon} title="Informações da empresa" description="Usadas na sua assinatura e nas notas.">
        <div className="set-grid">
          <Field id="set-trade" label="Nome fantasia" optional><input id="set-trade" className="lx-input" value={form.company.tradeName} onChange={setCompany('tradeName')} /></Field>
          <Field id="set-legal" label="Razão social" optional><input id="set-legal" className="lx-input" value={form.company.legalName} onChange={setCompany('legalName')} /></Field>
          <Field id="set-doc" label="CNPJ ou CPF" optional><input id="set-doc" className="lx-input" inputMode="numeric" value={form.company.document} onChange={setCompany('document')} /></Field>
          <Field id="set-cphone" label="Telefone comercial" optional><input id="set-cphone" type="tel" className="lx-input" value={form.company.phone} onChange={setCompany('phone')} /></Field>
          <Field id="set-address" label="Endereço" optional className="set-grid__full"><input id="set-address" className="lx-input" value={form.company.address} onChange={setCompany('address')} /></Field>
          <Field id="set-city" label="Cidade / UF" optional><input id="set-city" className="lx-input" value={form.company.city} onChange={setCompany('city')} /></Field>
        </div>
      </Card>

      <div className="set-save">
        <button type="submit" className="lx-btn lx-btn--primary" disabled={saving || uploading}>{saving ? 'Salvando…' : 'Salvar perfil e empresa'}</button>
      </div>
    </form>
  );
}

function Plan() {
  const [state, setState] = useState({ status: 'loading' });
  useEffect(() => {
    api.get('restaurant/billing').then((d) => setState({ status: 'ready', ...d })).catch((err) => setState({ status: 'error', message: err.message }));
  }, []);

  return (
    <Card icon={CardIcon} title="Plano" description="A assinatura renova todo mês, a partir da data do pagamento.">
      {state.status === 'loading' && <p className="lx-hint">Carregando…</p>}
      {state.status === 'error' && <div className="lx-alert lx-alert--error"><AlertIcon size={18} />{state.message}</div>}
      {state.status === 'ready' && state.subscription && (
        <>
          <div className="adm-plan">
            <small>Plano atual</small>
            <strong>{PLANS[state.subscription.plan]?.name ?? state.subscription.plan}</strong>
            <span>{formatBRL(state.subscription.priceCents)}/mês</span>
            <span className="lx-badge lx-badge--success"><CheckIcon size={12} /> {state.subscription.status === 'active' ? 'Ativa' : state.subscription.status}</span>
            <p>
              Próxima renovação: <strong>{fullDate(state.subscription.currentPeriodEnd)}</strong> · todo dia {new Date(state.subscription.startedAt).getDate()} de cada mês.
              Assinante desde {fullDate(state.subscription.startedAt)}.
            </p>
          </div>
          <ul className="adm-payments">
            {state.payments.map((p, i) => (
              <li key={i}>
                <span>
                  <strong>{formatBRL(p.amountCents)}</strong>
                  <small>{fullDate(p.createdAt)} · {p.method === 'pix' ? 'Pix' : `${BRAND_NAMES[p.brand] ?? 'Cartão'} final ${p.last4}`}</small>
                </span>
                <span className={`lx-badge ${p.status === 'approved' ? 'lx-badge--success' : 'lx-badge--danger'}`}>{p.status === 'approved' ? 'Aprovado' : 'Recusado'}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function Password() {
  const { showToast } = useAdmin();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (form.next !== form.confirm) {
      setErrors({ confirm: 'As senhas não são iguais.' });
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      await api.put('account/password', { current: form.current, next: form.next });
      setForm({ current: '', next: '', confirm: '' });
      showToast('Senha alterada.');
    } catch (err) {
      setErrors(err.fields ?? {});
      if (!Object.keys(err.fields ?? {}).length) showToast(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save}>
      <Card icon={LockIcon} title="Senha" description="Use pelo menos 8 caracteres.">
        <div className="set-grid">
          <Field id="pw-current" label="Senha atual" error={errors.current}><input id="pw-current" type="password" className="lx-input" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} autoComplete="current-password" /></Field>
          <span />
          <Field id="pw-next" label="Nova senha" error={errors.next}><input id="pw-next" type="password" className="lx-input" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} autoComplete="new-password" /></Field>
          <Field id="pw-confirm" label="Confirmar nova senha" error={errors.confirm}><input id="pw-confirm" type="password" className="lx-input" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} autoComplete="new-password" /></Field>
        </div>
        <div className="set-save">
          <button type="submit" className="lx-btn lx-btn--primary" disabled={saving || !form.current || form.next.length < 8}>{saving ? 'Salvando…' : 'Alterar senha'}</button>
        </div>
      </Card>
    </form>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  useEffect(() => {
    document.title = 'Configurações — Lumenu';
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="lx-app set">
      <header className="set-top">
        <button type="button" className="adm-back" onClick={() => navigate('/painel')}><ArrowLeftIcon size={18} /> Voltar ao editor</button>
        <span className="lx-brand"><span className="lx-brand__mark"><LumenuMark /></span> Configurações</span>
        <span />
      </header>
      <main className="set-main">
        <ProfileAndCompany />
        <Plan />
        <Password />
      </main>
    </div>
  );
}
