import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PLANS, formatBRL } from '../../../shared/plans.js';
import { BRAND_NAMES } from '../../../shared/payments.js';
import { api } from '../../lib/api.js';
import { uploadImage } from '../../lib/images.js';
import { AlertIcon, CameraIcon, CardIcon, CheckIcon, LockIcon, MailIcon, ReceiptIcon, StoreIcon, UsersIcon, WhatsAppIcon } from '../../icons.jsx';
import { Field } from '../../ui.jsx';
import { BRL, dateBR, initials, useOps } from '../OpsContext.jsx';

const LUMENU_WHATSAPP = 'https://wa.me/5511947849239?text=';
const LUMENU_EMAIL = 'luispyim@icloud.com';
const longDate = (value) => dateBR(value, { day: '2-digit', month: 'long', year: 'numeric' });

function Card({ icon: Icon, title, description, id, children }) {
  return (
    <section className="set-card" id={id}>
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
  const { me, setMe, showToast } = useOps();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const file = useRef(null);

  // Os dados completos (telefone, empresa) vêm de auth/me, que é só do gerente.
  useEffect(() => {
    api.get('auth/me').then(({ account }) => {
      if (account) {
        setForm({
          name: account.name, email: account.email, phone: account.phone ?? '', avatarUrl: account.avatarUrl ?? null,
          company: { tradeName: '', legalName: '', document: '', phone: '', address: '', city: '', ...account.company },
        });
      }
    });
  }, []);
  if (!form) return <p className="lx-hint">Carregando…</p>;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const setCompany = (key) => (e) => setForm({ ...form, company: { ...form.company, [key]: e.target.value } });

  const pickAvatar = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setUploading(true);
    try {
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
      setMe((m) => ({ ...m, member: { ...m.member, name: data.account.name, email: data.account.email, avatarUrl: data.account.avatarUrl } }));
      showToast('Dados salvos.');
    } catch (err) {
      setErrors(err.fields ?? {});
      showToast(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="set-stack">
      <Card icon={UsersIcon} title="Meu perfil" description="Seus dados de acesso ao painel (conta principal).">
        <div className="set-avatar">
          <span className="set-avatar__img">
            {form.avatarUrl ? <img src={form.avatarUrl} alt="" /> : initials(form.name)}
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

function StaffProfile() {
  const { me } = useOps();
  return (
    <Card icon={UsersIcon} title="Meu acesso" description={`Você entra no painel do ${me.restaurant.name} pelo link que o gerente mandou.`}>
      <div className="set-avatar">
        <span className="set-avatar__img">{initials(me.member.name)}</span>
        <div>
          <strong>{me.member.name}</strong>
          <p className="lx-hint" style={{ margin: 0 }}>Cargo: {me.member.roleLabel}. Para mudar nome ou cargo, fale com o gerente.</p>
        </div>
      </div>
    </Card>
  );
}

function Operation() {
  const { context, loadContext, showToast } = useOps();
  const [fee, setFee] = useState(String(context.settings.serviceFee).replace('.', ','));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.put('ops/settings', { serviceFee: Number(fee.replace(',', '.')) });
      await loadContext();
      showToast('Taxa de serviço atualizada.');
    } catch (err) {
      setError(err.fields?.serviceFee ?? err.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={save}>
      <Card icon={ReceiptIcon} title="Operação do salão" description="Usada no checkout das mesas.">
        <div className="set-grid">
          <Field id="set-fee" label="Taxa de serviço (garçom)" error={error} hint="Padrão de 10%. No checkout dá para tirar a taxa se o cliente não quiser pagar.">
            <div className="adm-money"><input id="set-fee" className="lx-input" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} /><span>%</span></div>
          </Field>
        </div>
        <div className="set-save">
          <button type="submit" className="lx-btn lx-btn--primary" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </Card>
    </form>
  );
}

function Plan() {
  const { me, setMe, showToast } = useOps();
  const location = useLocation();
  const [state, setState] = useState({ status: 'loading' });
  const [busy, setBusy] = useState(false);
  const load = () => api.get('restaurant/billing').then((d) => setState({ status: 'ready', ...d })).catch((err) => setState({ status: 'error', message: err.message }));
  useEffect(() => {
    load();
  }, []);
  // Link do aviso de cancelamento (/painel/configuracoes#plano) rola até aqui depois de carregar.
  useEffect(() => {
    if (state.status === 'ready' && location.hash === '#plano') document.getElementById('plano')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [state.status, location.hash]);

  const act = async (path, confirmText, success) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const res = await api.post(path);
      showToast(success);
      setMe((m) => ({ ...m, subscription: { ...m.subscription, cancelAt: res.cancelAt ?? null } }));
      await load();
    } catch (err) {
      showToast(err.message);
    } finally {
      setBusy(false);
    }
  };

  const sub = state.subscription;
  const c = sub?.contract;
  const contact = `${LUMENU_WHATSAPP}${encodeURIComponent(`Olá! Quero falar sobre o cancelamento do plano do ${me.restaurant.name}.`)}`;
  return (
    <Card id="plano" icon={CardIcon} title="Plano" description="Contrato anual, cobrado todo mês no dia da assinatura.">
      {state.status === 'loading' && <p className="lx-hint">Carregando…</p>}
      {state.status === 'error' && <div className="lx-alert lx-alert--error"><AlertIcon size={18} />{state.message}</div>}
      {state.status === 'ready' && sub && (
        <>
          <div className="adm-plan">
            <small>Plano atual</small>
            <strong>{PLANS[sub.plan]?.name ?? sub.plan}</strong>
            <span>{formatBRL(sub.priceCents)}/mês · contrato de {c.contractMonths} meses</span>
            {c.cancelAt ? (
              <span className="lx-badge lx-badge--warning">Cancelado · ativo até {dateBR(c.cancelAt)}</span>
            ) : (
              <span className="lx-badge lx-badge--success"><CheckIcon size={12} /> Ativo</span>
            )}
          </div>
          <dl className="set-facts">
            <div><dt>Contrato atual</dt><dd>{dateBR(c.contractStart)} a {dateBR(c.contractEnd)}</dd></div>
            <div><dt>Mês do contrato</dt><dd>{c.monthInContract} de {c.contractMonths}</dd></div>
            <div><dt>Próxima cobrança</dt><dd>{c.cancelAt ? '—' : `${longDate(c.nextBilling)} · todo dia ${new Date(sub.startedAt).getDate()}`}</dd></div>
            <div><dt>Assinante desde</dt><dd>{longDate(sub.startedAt)}</dd></div>
          </dl>

          <div className={`set-cancel ${c.cancelAt ? 'is-scheduled' : ''}`}>
            {c.cancelAt ? (
              <>
                <strong>Cancelamento agendado</strong>
                <p>Seu plano continua funcionando até {longDate(c.cancelAt)}. Depois disso, o painel e o site do restaurante saem do ar.</p>
                <button type="button" className="lx-btn lx-btn--primary lx-btn--sm" disabled={busy} onClick={() => act('account/subscription/resume', null, 'Ótimo! Seu plano continua ativo.')}>Manter meu plano</button>
              </>
            ) : c.canCancel ? (
              <>
                <strong>Cancelar plano</strong>
                <p>Você está no último mês do contrato e pode cancelar sem multa. O plano fica ativo até {longDate(c.nextBilling)}, a data da próxima cobrança. Se não cancelar, o contrato renova por mais {c.contractMonths} meses.</p>
                <button
                  type="button"
                  className="lx-btn lx-btn--danger lx-btn--sm"
                  disabled={busy}
                  onClick={() => act('account/subscription/cancel', `Cancelar o plano? Ele continua ativo até ${longDate(c.nextBilling)} e depois o painel e o site saem do ar.`, `Plano cancelado. Fica ativo até ${dateBR(c.nextBilling)}.`)}
                >
                  Cancelar plano
                </button>
              </>
            ) : (
              <>
                <strong>Cancelar plano</strong>
                <p>
                  O cancelamento sem multa fica disponível no último mês do contrato, a partir de <b>{longDate(c.cancelWindowStart)}</b>
                  {c.daysToCancelWindow > 0 && ` (faltam ${c.daysToCancelWindow} dias)`}. Para cancelar antes, fale com a nossa equipe:
                  há multa por quebra de contrato, conforme os <a href="/termos.html#cancelamento" target="_blank" rel="noopener">Termos de Uso</a>.
                </p>
                <div className="set-cancel__actions">
                  <button type="button" className="lx-btn lx-btn--secondary lx-btn--sm" disabled title={`Disponível a partir de ${dateBR(c.cancelWindowStart)}`}>Cancelar plano</button>
                  <a className="lx-btn lx-btn--plain lx-btn--sm" href={contact} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={15} /> Falar com a equipe</a>
                  <a className="lx-btn lx-btn--plain lx-btn--sm" href={`mailto:${LUMENU_EMAIL}?subject=${encodeURIComponent('Cancelamento do plano')}`}><MailIcon size={15} /> E-mail</a>
                </div>
              </>
            )}
          </div>

          <ul className="adm-payments">
            {state.payments.map((p, i) => (
              <li key={i}>
                <span>
                  <strong>{BRL(p.amountCents)}</strong>
                  <small>{longDate(p.createdAt)} · {p.method === 'pix' ? 'Pix' : `${BRAND_NAMES[p.brand] ?? 'Cartão'} final ${p.last4}`}</small>
                </span>
                <span className={`lx-badge ${p.status === 'approved' ? 'lx-badge--success' : 'lx-badge--danger'}`}>{p.status === 'approved' ? 'Aprovado' : 'Recusado'}</span>
              </li>
            ))}
          </ul>
          <p className="lx-hint" style={{ margin: 0 }}>Gateway de exemplo: nenhuma cobrança real foi feita.{sub.termsAcceptedAt && ` Termos de Uso aceitos em ${dateBR(sub.termsAcceptedAt)}.`}</p>
        </>
      )}
    </Card>
  );
}

function Password() {
  const { me, showToast } = useOps();
  const staff = me.member.kind === 'staff';
  const min = staff ? 6 : 8;
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
      await api.put(staff ? 'team/password' : 'account/password', { current: form.current, next: form.next });
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
      <Card icon={LockIcon} title="Senha" description={`Use pelo menos ${min} caracteres.`}>
        <div className="set-grid">
          <Field id="pw-current" label="Senha atual" error={errors.current}><input id="pw-current" type="password" className="lx-input" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} autoComplete="current-password" /></Field>
          <span />
          <Field id="pw-next" label="Nova senha" error={errors.next}><input id="pw-next" type="password" className="lx-input" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} autoComplete="new-password" /></Field>
          <Field id="pw-confirm" label="Confirmar nova senha" error={errors.confirm}><input id="pw-confirm" type="password" className="lx-input" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} autoComplete="new-password" /></Field>
        </div>
        <div className="set-save">
          <button type="submit" className="lx-btn lx-btn--primary" disabled={saving || !form.current || form.next.length < min}>{saving ? 'Salvando…' : 'Alterar senha'}</button>
        </div>
      </Card>
    </form>
  );
}

export default function SettingsPage() {
  const { me, can } = useOps();
  const owner = me.member.kind === 'owner';

  return (
    <div className="ops-page">
      <header className="ops-head">
        <div>
          <h1>Configurações</h1>
          <p className="ops-head__lead">{owner ? 'Perfil, empresa, operação, plano e senha.' : 'Seu acesso ao painel e sua senha.'}</p>
        </div>
      </header>
      <div className="set-stack">
        {owner ? <ProfileAndCompany /> : <StaffProfile />}
        {can('settings') && <Operation />}
        {can('billing') && <Plan />}
        <Password />
      </div>
    </div>
  );
}
