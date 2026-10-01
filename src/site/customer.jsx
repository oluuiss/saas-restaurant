import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { AlertIcon, CloseIcon } from '../icons.jsx';
import { SButton } from './SButton.jsx';
import { useSite } from './SiteContext.jsx';

const CustomerContext = createContext(null);

// No painel (prévia) não existe cliente logado: os botões aparecem, mas não fazem nada.
const PREVIEW = { customer: null, preview: true, requireLogin: () => false, openAuth: () => {}, logout: () => {}, refresh: () => {}, auth: null, closeAuth: () => {} };

/** Conta do cliente no site de um restaurante. `customer`: undefined = carregando, null = sem login. */
export function CustomerProvider({ slug, children }) {
  const [customer, setCustomer] = useState(undefined);
  const [auth, setAuth] = useState(null);

  const refresh = useCallback(
    () => api.get(`s/${slug}/auth/me`).then((d) => setCustomer(d.customer)).catch(() => setCustomer(null)),
    [slug],
  );
  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      customer,
      setCustomer,
      refresh,
      auth,
      openAuth: (mode = 'login', reason) => setAuth({ mode, reason }),
      closeAuth: () => setAuth(null),
      /** Executa `then` se já estiver logado; senão abre o login e executa depois de entrar. */
      requireLogin: (reason, then) => {
        if (customer) {
          then?.();
          return true;
        }
        setAuth({ mode: 'login', reason, then });
        return false;
      },
      logout: async () => {
        await api.post(`s/${slug}/auth/logout`).catch(() => {});
        setCustomer(null);
      },
    }),
    [customer, refresh, auth, slug],
  );

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}

export const useCustomer = () => useContext(CustomerContext) ?? PREVIEW;

export function AuthModal() {
  const { slug, site, t } = useSite();
  const { auth, closeAuth, setCustomer } = useCustomer();
  const [mode, setMode] = useState(auth?.mode ?? 'login');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth) setMode(auth.mode);
  }, [auth]);

  useEffect(() => {
    if (!auth) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeAuth();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [auth, closeAuth]);

  if (!auth) return null;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage('');
    try {
      const body = mode === 'login' ? { email: form.email, password: form.password } : form;
      const data = await api.post(`s/${slug}/auth/${mode === 'login' ? 'login' : 'register'}`, body);
      setCustomer(data.customer);
      const then = auth.then;
      closeAuth();
      then?.();
    } catch (err) {
      setErrors(err.fields ?? {});
      setMessage(err.status === 401 ? t('auth.wrong') : Object.keys(err.fields ?? {}).length ? '' : t('auth.error'));
    } finally {
      setBusy(false);
    }
  };

  const field = (key, type = 'text', extra = {}) => (
    <label className="s-field">
      <span>{t(`auth.${key}`)}</span>
      <input className={`s-input ${errors[key] ? 'is-invalid' : ''}`} type={type} value={form[key]} onChange={set(key)} required {...extra} />
      {errors[key] && <small className="s-field__error">{errors[key]}</small>}
    </label>
  );

  return (
    <div className="s-modal" role="dialog" aria-modal="true" aria-labelledby="s-auth-title" onClick={closeAuth}>
      <form className="s-modal__card s-glass" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <button type="button" className="s-modal__close" onClick={closeAuth} aria-label={t('auth.close')}><CloseIcon size={18} /></button>
        <h3 id="s-auth-title">{mode === 'login' ? t('auth.login') : t('auth.register')}</h3>
        <p className="s-muted">{auth.reason ?? t('auth.subtitle', { name: site.brand.name })}</p>
        <div className="s-form">
          {mode === 'register' && field('name', 'text', { autoComplete: 'name', minLength: 2 })}
          {field('email', 'email', { autoComplete: 'email' })}
          {mode === 'register' && field('phone', 'tel', { autoComplete: 'tel' })}
          {field('password', 'password', { autoComplete: mode === 'login' ? 'current-password' : 'new-password', minLength: mode === 'register' ? 8 : undefined })}
        </div>
        {message && <div className="s-alert" role="alert"><AlertIcon size={18} />{message}</div>}
        <SButton type="submit" size="lg" block loading={busy}>{mode === 'login' ? t('auth.login') : t('auth.register')}</SButton>
        <button type="button" className="s-link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErrors({}); setMessage(''); }}>
          {mode === 'login' ? t('auth.toRegister') : t('auth.toLogin')}
        </button>
      </form>
    </div>
  );
}
