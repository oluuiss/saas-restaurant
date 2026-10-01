import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { AlertIcon } from '../icons.jsx';
import { Brand, Field } from '../ui.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = 'Entrar — Lumenu';
    api.get('auth/me').then((me) => me.account && navigate('/painel', { replace: true })).catch(() => {});
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    setErrors({});
    try {
      await api.post('auth/login', form);
      navigate('/painel', { replace: true });
    } catch (err) {
      setErrors(err.fields);
      setMessage(Object.keys(err.fields).length ? '' : err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="lx-app auth">
      <div className="auth__card">
        <Brand />
        <h1>Entrar no painel</h1>
        <p>Edite o site, o cardápio e as mesas do seu restaurante.</p>
        <form className="auth__form" onSubmit={submit} noValidate>
          <Field id="login-email" label="E-mail" error={errors.email}>
            <input id="login-email" type="email" autoComplete="email" className={`lx-input ${errors.email ? 'is-invalid' : ''}`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoFocus />
          </Field>
          <Field id="login-password" label="Senha" error={errors.password}>
            <div className="auth__pw">
              <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" className={`lx-input ${errors.password ? 'is-invalid' : ''}`} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Ocultar' : 'Mostrar'}</button>
            </div>
          </Field>
          {message && <div className="lx-alert lx-alert--error" role="alert"><AlertIcon size={18} />{message}</div>}
          <button type="submit" className="lx-btn lx-btn--primary lx-btn--lg lx-btn--block" disabled={submitting}>
            {submitting ? <span className="lx-spinner" aria-label="Entrando" /> : 'Entrar'}
          </button>
        </form>
        <p className="auth__foot">Ainda não é cliente? <Link to="/assinar?plano=ultimate">Assinar o Lumenu</Link></p>
      </div>
    </div>
  );
}
