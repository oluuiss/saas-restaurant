import { useCallback, useEffect, useRef, useState } from 'react';
import { ROLES, STAFF_ROLES } from '../../../shared/roles.js';
import { api } from '../../lib/api.js';
import {
  AlertIcon, CheckIcon, CloseIcon, CopyIcon, EyeIcon, EyeOffIcon, KeyIcon, LinkIcon, PhoneIcon, RotateIcon, TrashIcon, UserPlusIcon, UsersIcon, WhatsAppIcon,
} from '../../icons.jsx';
import { Field, Switch } from '../../ui.jsx';
import { ago, initials, useOps } from '../OpsContext.jsx';

const staffLink = (code) => `${window.location.origin}/equipe/${code}`;
const digits = (v) => String(v ?? '').replace(/\D/g, '');
const whatsappShare = (staff, restaurant) => {
  const text = `Olá, ${staff.name.split(/\s+/)[0]}! Este é o seu acesso ao painel do ${restaurant}: ${staffLink(staff.code)}\nEntre com a senha que eu te passei. Depois você pode trocar em Configurações.`;
  const phone = digits(staff.phone);
  return `https://wa.me/${phone ? (phone.length <= 11 ? `55${phone}` : phone) : ''}?text=${encodeURIComponent(text)}`;
};

/** Sugestão de senha fácil de ditar: duas palavras + número. */
function suggestPassword() {
  const words = ['mesa', 'brasa', 'sal', 'forno', 'prato', 'menu', 'chef', 'massa', 'mate', 'limao', 'cafe', 'pao'];
  const pick = () => words[crypto.getRandomValues(new Uint32Array(1))[0] % words.length];
  return `${pick()}${pick()}${String(crypto.getRandomValues(new Uint32Array(1))[0] % 90 + 10)}`;
}

function PasswordInput({ id, value, onChange, error }) {
  const [show, setShow] = useState(true);
  return (
    <Field id={id} label="Senha de acesso" error={error} hint="O colaborador pode trocar depois em Configurações. Mínimo de 6 caracteres.">
      <div className="auth__pw">
        <input id={id} type={show ? 'text' : 'password'} className="lx-input" value={value} onChange={(e) => onChange(e.target.value)} autoComplete="new-password" />
        <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>{show ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}</button>
      </div>
      <button type="button" className="lx-btn lx-btn--plain lx-btn--sm ops-suggest" onClick={() => onChange(suggestPassword())}><RotateIcon size={13} /> Sugerir senha</button>
    </Field>
  );
}

function RolePicker({ value, onChange, error }) {
  return (
    <fieldset className="ops-roles">
      <legend className="lx-label">Cargo</legend>
      {STAFF_ROLES.map((role) => (
        <label key={role} className={`ops-role ${value === role ? 'is-on' : ''}`}>
          <input type="radio" name="role" value={role} checked={value === role} onChange={() => onChange(role)} />
          <span>
            <strong>{ROLES[role].label}</strong>
            <small>{ROLES[role].description}</small>
          </span>
        </label>
      ))}
      {error && <span className="lx-error" role="alert">{error}</span>}
    </fieldset>
  );
}

function LinkBox({ staff, restaurant }) {
  const { showToast } = useOps();
  const link = staffLink(staff.code);
  return (
    <div className="ops-linkbox">
      <LinkIcon size={16} />
      <code>{link}</code>
      <button type="button" className="lx-btn lx-btn--secondary lx-btn--sm" onClick={() => { navigator.clipboard?.writeText(link); showToast('Link copiado.'); }}><CopyIcon size={14} /> Copiar</button>
      <a className="lx-btn lx-btn--secondary lx-btn--sm" href={whatsappShare(staff, restaurant)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={14} /> WhatsApp</a>
    </div>
  );
}

function StaffDialog({ staff, onClose, onSaved }) {
  const { me } = useOps();
  const [form, setForm] = useState(staff ? { name: staff.name, role: staff.role, phone: staff.phone } : { name: '', role: 'garcom', phone: '', password: suggestPassword() });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const sending = useRef(false);

  const save = async (e) => {
    e.preventDefault();
    if (sending.current) return; // dois toques rápidos não cadastram duas vezes
    sending.current = true;
    setSaving(true);
    setErrors({});
    try {
      if (staff) {
        await api.put(`team/staff/${staff.id}`, { ...form, active: staff.active });
        onSaved();
      } else {
        const res = await api.post('team/staff', form);
        setCreated({ ...res.staff, password: form.password });
        onSaved(false);
      }
    } catch (err) {
      setErrors(Object.keys(err.fields ?? {}).length ? err.fields : { name: err.message });
    } finally {
      sending.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="ops-sheet" role="dialog" aria-modal="true" aria-label={staff ? 'Editar colaborador' : 'Novo colaborador'} onClick={onClose}>
      <form className="ops-sheet__card is-tall" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <header className="ops-sheet__head">
          <div>
            <h2>{created ? 'Colaborador cadastrado' : staff ? 'Editar colaborador' : 'Novo colaborador'}</h2>
            <p>{created ? 'Mande o link e a senha para a pessoa entrar.' : 'A pessoa entra pelo link que vamos gerar, com a senha que você escolher.'}</p>
          </div>
          <button type="button" className="ops-sheet__close" onClick={onClose} aria-label="Fechar"><CloseIcon size={18} /></button>
        </header>
        {created ? (
          <div className="ops-form">
            <div className="ops-created">
              <span className="co-done__icon"><CheckIcon size={26} /></span>
              <strong>{created.name}</strong>
              <span className="lx-badge lx-badge--info">{created.roleLabel}</span>
            </div>
            <span className="lx-label">Link de acesso</span>
            <LinkBox staff={created} restaurant={me.restaurant.name} />
            <div className="ops-linkbox ops-linkbox--pw"><KeyIcon size={16} /> Senha: <code>{created.password}</code></div>
            <p className="lx-hint" style={{ margin: 0 }}>Por segurança, a senha não vai na mensagem do WhatsApp: passe pessoalmente. O link é pessoal; se for perdido, gere um novo na lista.</p>
            <div className="ops-sheet__actions">
              <button type="button" className="lx-btn lx-btn--primary" onClick={onClose}>Concluir</button>
            </div>
          </div>
        ) : (
          <>
            <div className="ops-form">
              <div className="lx-row">
                <Field id="st-name" label="Nome" error={errors.name}>
                  <input id="st-name" className="lx-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus={!staff} autoComplete="off" />
                </Field>
                <Field id="st-phone" label="Celular" optional>
                  <input id="st-phone" type="tel" className="lx-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 90000-0000" />
                </Field>
              </div>
              <RolePicker value={form.role} onChange={(role) => setForm({ ...form, role })} error={errors.role} />
              {!staff && <PasswordInput id="st-pass" value={form.password} onChange={(password) => setForm({ ...form, password })} error={errors.password} />}
            </div>
            <div className="ops-sheet__actions">
              <button type="button" className="lx-btn lx-btn--ghost" onClick={onClose}>Cancelar</button>
              <button type="submit" className="lx-btn lx-btn--primary" disabled={saving}>{saving ? 'Salvando…' : staff ? 'Salvar' : 'Cadastrar e gerar link'}</button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

function PasswordDialog({ staff, onClose }) {
  const { showToast } = useOps();
  const [password, setPassword] = useState(suggestPassword());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`team/staff/${staff.id}/password`, { password });
      showToast(`Senha de ${staff.name.split(/\s+/)[0]} alterada. É preciso entrar de novo.`);
      onClose();
    } catch (err) {
      setError(err.fields?.password ?? err.message);
      setSaving(false);
    }
  };
  return (
    <div className="ops-sheet" role="dialog" aria-modal="true" aria-label="Nova senha" onClick={onClose}>
      <form className="ops-sheet__card" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <header className="ops-sheet__head">
          <div><h2>Nova senha para {staff.name}</h2><p>A sessão aberta cai e o acesso volta com a senha nova.</p></div>
          <button type="button" className="ops-sheet__close" onClick={onClose} aria-label="Fechar"><CloseIcon size={18} /></button>
        </header>
        <div className="ops-form"><PasswordInput id="reset-pass" value={password} onChange={setPassword} error={error} /></div>
        <div className="ops-sheet__actions">
          <button type="button" className="lx-btn lx-btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="lx-btn lx-btn--primary" disabled={saving}>{saving ? 'Salvando…' : 'Definir senha'}</button>
        </div>
      </form>
    </div>
  );
}

export default function TeamPage() {
  const { me, showToast } = useOps();
  const [state, setState] = useState({ status: 'loading', list: [] });
  const [dialog, setDialog] = useState(null); // { kind: 'new'|'edit'|'password', staff }

  const load = useCallback(() => {
    api.get('team/staff').then((d) => setState({ status: 'ready', list: d.staff })).catch((err) => setState({ status: 'error', list: [], message: err.message }));
  }, []);
  useEffect(load, [load]);

  const call = async (fn, success) => {
    try {
      await fn();
      if (success) showToast(success);
      load();
    } catch (err) {
      showToast(err.message);
    }
  };

  const self = (s) => me.member.kind === 'staff' && me.member.id === s.id;

  return (
    <div className="ops-page">
      <header className="ops-head">
        <div>
          <h1>Colaboradores</h1>
          <p className="ops-head__lead">Cadastre a equipe e mande o link de acesso. Cada cargo vê só o que precisa; só você e os sócios editam o site.</p>
        </div>
        <button type="button" className="lx-btn lx-btn--primary" onClick={() => setDialog({ kind: 'new' })}><UserPlusIcon size={17} /> Novo colaborador</button>
      </header>

      {state.status === 'error' && <div className="lx-alert lx-alert--error"><AlertIcon size={18} />{state.message}</div>}
      {state.status === 'ready' && !state.list.length && (
        <div className="adm-empty">
          <UsersIcon size={22} />
          <strong>Nenhum colaborador ainda</strong>
          <span>Cadastre garçons, caixa, cozinha e recepção. Cada um recebe um link próprio para entrar no painel pelo celular.</span>
        </div>
      )}

      <ul className="ops-staff">
        {state.list.map((s) => (
          <li key={s.id} className={s.active ? '' : 'is-off'}>
            <div className="ops-staff__top">
              <span className="ops-avatar">{initials(s.name)}</span>
              <span className="ops-staff__who">
                <strong>{s.name}{self(s) && ' (você)'}</strong>
                <small>
                  <span className={`lx-badge ${s.role === 'socio' ? 'lx-badge--success' : 'lx-badge--info'}`}>{s.roleLabel}</span>
                  {s.phone && <> · <PhoneIcon size={12} /> {s.phone}</>}
                  {' · '}{s.lastLoginAt ? `último acesso ${ago(s.lastLoginAt)}` : 'ainda não entrou'}
                </small>
              </span>
              <span className="ops-staff__toggle">
                <small>{s.active ? 'Ativo' : 'Desativado'}</small>
                <Switch
                  checked={s.active}
                  onChange={(v) => !self(s) && call(() => api.put(`team/staff/${s.id}`, { name: s.name, role: s.role, phone: s.phone, active: v }), v ? `${s.name} voltou a ter acesso.` : `Acesso de ${s.name} desativado.`)}
                  label={`Acesso de ${s.name}`}
                />
              </span>
            </div>
            {s.active && <LinkBox staff={s} restaurant={me.restaurant.name} />}
            <div className="ops-staff__actions">
              <button type="button" className="lx-btn lx-btn--plain lx-btn--sm" onClick={() => setDialog({ kind: 'edit', staff: s })}>Editar nome e cargo</button>
              <button type="button" className="lx-btn lx-btn--plain lx-btn--sm" onClick={() => setDialog({ kind: 'password', staff: s })}><KeyIcon size={14} /> Nova senha</button>
              {!self(s) && (
                <button type="button" className="lx-btn lx-btn--plain lx-btn--sm" onClick={() => window.confirm(`Gerar um link novo para ${s.name}? O link atual para de funcionar.`) && call(() => api.post(`team/staff/${s.id}/link`), 'Link novo gerado. Mande para a pessoa.')}>
                  <RotateIcon size={14} /> Gerar novo link
                </button>
              )}
              {!self(s) && (
                <button type="button" className="lx-btn lx-btn--plain lx-btn--sm adm-danger-text" onClick={() => window.confirm(`Remover ${s.name} da equipe?`) && call(() => api.del(`team/staff/${s.id}`), `${s.name} foi removido.`)}>
                  <TrashIcon size={14} /> Remover
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <section className="ops-card">
        <h2>O que cada cargo vê</h2>
        <ul className="ops-rolelist">
          <li><strong>Gerente (você)</strong><span>{ROLES.owner.description} Inclui o plano e a assinatura.</span></li>
          {STAFF_ROLES.map((r) => <li key={r}><strong>{ROLES[r].label}</strong><span>{ROLES[r].description}</span></li>)}
        </ul>
      </section>

      {dialog?.kind === 'new' && <StaffDialog onClose={() => setDialog(null)} onSaved={(close = true) => { load(); if (close) setDialog(null); }} />}
      {dialog?.kind === 'edit' && <StaffDialog staff={dialog.staff} onClose={() => setDialog(null)} onSaved={() => { load(); setDialog(null); showToast('Colaborador atualizado.'); }} />}
      {dialog?.kind === 'password' && <PasswordDialog staff={dialog.staff} onClose={() => setDialog(null)} />}
    </div>
  );
}
