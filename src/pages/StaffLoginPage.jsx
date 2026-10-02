import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { AlertIcon, LockIcon } from '../icons.jsx';
import { Field, LumenuMark } from '../ui.jsx';
import { STAFF_CODE_KEY } from '../ops/OpsContext.jsx';

/** Login da equipe pelo link que o gerente gerou: /equipe/<código>. Só pede a senha. */
export default function StaffLoginPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState({ status: 'loading' });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Entrar na equipe — Lumenu';
    api
      .get(`team/invite/${encodeURIComponent(code)}`)
      .then((d) => setInvite({ status: 'ready', ...d }))
      .catch((err) => setInvite({ status: 'error', message: err.message }));
  }, [code]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('team/login', { code, password });
      try {
        localStorage.setItem(STAFF_CODE_KEY, code);
      } catch {
        /* sem armazenamento: tudo bem */
      }
      navigate('/painel', { replace: true });
    } catch (err) {
      setError(err.fields?.password ?? err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="lx-app auth">
      <div className="auth__card">
        {invite.status === 'loading' && <span className="lx-spinner lx-spinner--blue" aria-label="Carregando" />}
        {invite.status === 'error' && (
          <>
            <span className="staff-login__logo"><LumenuMark size={26} /></span>
            <h1>Link inválido</h1>
            <p>{invite.message}</p>
          </>
        )}
        {invite.status === 'ready' && (
          <>
            <span className="staff-login__logo">{invite.restaurant.logo ? <img src={invite.restaurant.logo} alt="" /> : <LumenuMark size={26} />}</span>
            <p className="staff-login__eyebrow">{invite.restaurant.name} · Equipe</p>
            <h1>Olá, {invite.name}!</h1>
            {invite.active ? (
              <>
                <p>Digite a senha que o gerente te passou para entrar no painel.</p>
                <form className="auth__form" onSubmit={submit} noValidate>
                  <Field id="staff-password" label="Senha" error={error}>
                    <div className="auth__pw">
                      <input
                        id="staff-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        className={`lx-input ${error ? 'is-invalid' : ''}`}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                      />
                      <button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Ocultar' : 'Mostrar'}</button>
                    </div>
                  </Field>
                  <button type="submit" className="lx-btn lx-btn--primary lx-btn--lg lx-btn--block" disabled={submitting || !password}>
                    {submitting ? <span className="lx-spinner" aria-label="Entrando" /> : 'Entrar'}
                  </button>
                </form>
                <p className="auth__foot"><LockIcon size={13} /> Este link é só seu. Esqueceu a senha? Peça uma nova ao gerente.</p>
              </>
            ) : (
              <div className="lx-alert lx-alert--error"><AlertIcon size={18} />Seu acesso foi desativado. Fale com o gerente.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
