import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FEATURE_LABELS, PLANS, formatBRL } from '../../shared/plans.js';
import { BRAND_NAMES, TEST_CARDS, cardBrand, digitsOnly } from '../../shared/payments.js';
import { siteLabel, slugify } from '../../shared/slug.js';
import { api } from '../lib/api.js';
import { AlertIcon, CardIcon, CheckIcon, CopyIcon, GlobeIcon, LockIcon, PixIcon, ShieldIcon } from '../icons.jsx';
import { Brand, Field, PseudoQr } from '../ui.jsx';

const EXTRAS = ['Site com cardápio digital', 'Planta do salão e reservas online', 'Até 3 idiomas (PT, EN, DE)', 'Edição direto na tela, sem código'];

const formatCardNumber = (value) => {
  const d = digitsOnly(value).slice(0, 19);
  if (cardBrand(d) === 'amex') return [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(' ');
  return d.replace(/(\d{4})(?=\d)/g, '$1 ');
};
const formatExpiry = (value, previous = '') => {
  const d = digitsOnly(value).slice(0, 4);
  if (d.length < 3) return d.length === 2 && previous.length < value.length ? `${d}/` : d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
};

export default function CheckoutPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const plan = PLANS[params.get('plano')] ?? PLANS.ultimate;

  const [form, setForm] = useState({ name: '', email: '', password: '', restaurantName: '' });
  const [method, setMethod] = useState('card');
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', holder: '' });
  const [pixReady, setPixReady] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    document.title = `Assinar ${plan.name} — Lumenu`;
    api.get('auth/me').then((me) => setLoggedIn(Boolean(me.account))).catch(() => {});
  }, [plan.name]);

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setErrors({ ...errors, [key]: undefined });
  };
  const setCardField = (key, value) => {
    setCard({ ...card, [key]: value });
    setErrors({ ...errors, [key]: undefined });
  };

  const slug = slugify(form.restaurantName);
  const brand = cardBrand(card.number);

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Informe seu nome.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = 'Informe um e-mail válido.';
    if (form.password.length < 8) e.password = 'Use pelo menos 8 caracteres.';
    if (form.restaurantName.trim().length < 2) e.restaurantName = 'Informe o nome do restaurante.';
    if (method === 'card') {
      if (digitsOnly(card.number).length < 13) e.number = 'Informe o número do cartão.';
      if (!/^\d{2}\/\d{2}$/.test(card.expiry)) e.expiry = 'Use o formato MM/AA.';
      if (digitsOnly(card.cvc).length < 3) e.cvc = 'CVV inválido.';
      if (card.holder.trim().length < 3) e.holder = 'Nome como está no cartão.';
    }
    return e;
  };

  const pay = async (e) => {
    e?.preventDefault();
    const found = validate();
    setErrors(found);
    setMessage('');
    if (Object.keys(found).length) {
      setMessage('Confira os campos destacados.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.post('checkout', {
        plan: plan.id,
        ...form,
        payment: method === 'pix' ? { method: 'pix' } : { method: 'card', card },
      });
      setDone(result);
    } catch (err) {
      setErrors(err.fields);
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!plan.checkout) {
    return (
      <div className="lx-app co-done">
        <div className="co-done__card">
          <h1>{plan.name} chega em breve</h1>
          <p>Por enquanto, o plano {plan.name} é contratado com a nossa equipe. O Ultimate já pode ser assinado online.</p>
          <Link className="lx-btn lx-btn--primary lx-btn--lg" to="/assinar?plano=ultimate">Assinar o Ultimate</Link>
          <a className="lx-btn lx-btn--plain" href="/#contato">Falar com a gente</a>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="lx-app co-done">
        <div className="co-done__card" role="status">
          <span className="co-done__icon"><CheckIcon size={36} /></span>
          <h1>Pagamento aprovado!</h1>
          <p>
            {done.payment.method === 'pix' ? 'Pix recebido' : `${BRAND_NAMES[done.payment.brand] ?? 'Cartão'} final ${done.payment.last4}`} ·{' '}
            {formatBRL(done.payment.amountCents)}. Sua conta e o site do seu restaurante já estão prontos.
          </p>
          <div className="co-done__domain">{siteLabel(done.slug)}</div>
          <button type="button" className="lx-btn lx-btn--primary lx-btn--lg lx-btn--block" onClick={() => navigate('/painel')}>
            Ir para o meu painel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lx-app co">
      <header className="co__top">
        <Brand />
        <span className="co__secure"><LockIcon size={15} /> Pagamento protegido · ambiente de teste</span>
      </header>

      <div className="co__grid">
        <form className="co__form" onSubmit={pay} noValidate>
          <div>
            <h1 className="co__title">Assine o {plan.name}</h1>
            <p className="co__lead">Crie sua conta e, assim que o pagamento for aprovado, o painel do seu restaurante abre na hora.</p>
            {loggedIn && (
              <div className="lx-alert lx-alert--info">
                <AlertIcon size={18} />
                <span>Você já está conectado. <Link to="/painel">Ir para o painel</Link></span>
              </div>
            )}
          </div>

          <section className="co-card">
            <div className="co-card__head"><span className="co-card__num">1</span><h2>Sua conta</h2></div>
            <div className="co-card__body">
              <Field id="co-name" label="Seu nome" error={errors.name}>
                <input id="co-name" className={`lx-input ${errors.name ? 'is-invalid' : ''}`} autoComplete="name" value={form.name} onChange={set('name')} />
              </Field>
              <div className="lx-row">
                <Field id="co-email" label="E-mail" error={errors.email}>
                  <input id="co-email" type="email" className={`lx-input ${errors.email ? 'is-invalid' : ''}`} autoComplete="email" value={form.email} onChange={set('email')} />
                </Field>
                <Field id="co-password" label="Senha" error={errors.password} hint="Mínimo de 8 caracteres">
                  <div className="auth__pw">
                    <input id="co-password" type={showPassword ? 'text' : 'password'} className={`lx-input ${errors.password ? 'is-invalid' : ''}`} autoComplete="new-password" value={form.password} onChange={set('password')} />
                    <button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Ocultar' : 'Mostrar'}</button>
                  </div>
                </Field>
              </div>
            </div>
          </section>

          <section className="co-card">
            <div className="co-card__head"><span className="co-card__num">2</span><h2>Seu restaurante</h2></div>
            <div className="co-card__body">
              <Field id="co-restaurant" label="Nome do restaurante" error={errors.restaurantName}>
                <input id="co-restaurant" className={`lx-input ${errors.restaurantName ? 'is-invalid' : ''}`} autoComplete="organization" value={form.restaurantName} onChange={set('restaurantName')} placeholder="Ex.: Cantina da Nona" />
              </Field>
              <div className="co-domain">
                <GlobeIcon size={16} />
                <span>Seu site:</span>
                <strong>{siteLabel(slug || 'seu-restaurante')}</strong>
              </div>
            </div>
          </section>

          <section className="co-card">
            <div className="co-card__head"><span className="co-card__num">3</span><h2>Pagamento</h2></div>
            <div className="co-card__body">
              <div className="co-methods">
                <button type="button" className="co-method" aria-pressed={method === 'card'} onClick={() => setMethod('card')}><CardIcon size={20} /> Cartão</button>
                <button type="button" className="co-method" aria-pressed={method === 'pix'} onClick={() => setMethod('pix')}><PixIcon size={20} /> Pix</button>
              </div>

              {method === 'card' ? (
                <>
                  <div className="co-cardview" aria-hidden="true">
                    <div className="co-cardview__chip" />
                    <span className="co-cardview__brand">{BRAND_NAMES[brand] ?? ''}</span>
                    <div className="co-cardview__number">{formatCardNumber(card.number) || '•••• •••• •••• ••••'}</div>
                    <div className="co-cardview__foot">
                      <span><small>Nome</small>{card.holder || 'SEU NOME'}</span>
                      <span><small>Validade</small>{card.expiry || 'MM/AA'}</span>
                    </div>
                  </div>
                  <Field id="co-number" label="Número do cartão" error={errors.number}>
                    <input id="co-number" inputMode="numeric" autoComplete="cc-number" className={`lx-input ${errors.number ? 'is-invalid' : ''}`} placeholder="0000 0000 0000 0000" value={card.number} onChange={(e) => setCardField('number', formatCardNumber(e.target.value))} />
                  </Field>
                  <div className="lx-row">
                    <Field id="co-expiry" label="Validade" error={errors.expiry}>
                      <input id="co-expiry" inputMode="numeric" autoComplete="cc-exp" className={`lx-input ${errors.expiry ? 'is-invalid' : ''}`} placeholder="MM/AA" value={card.expiry} onChange={(e) => setCardField('expiry', formatExpiry(e.target.value, card.expiry))} />
                    </Field>
                    <Field id="co-cvc" label="CVV" error={errors.cvc}>
                      <input id="co-cvc" inputMode="numeric" autoComplete="cc-csc" className={`lx-input ${errors.cvc ? 'is-invalid' : ''}`} placeholder="123" value={card.cvc} onChange={(e) => setCardField('cvc', digitsOnly(e.target.value).slice(0, 4))} />
                    </Field>
                  </div>
                  <Field id="co-holder" label="Nome impresso no cartão" error={errors.holder}>
                    <input id="co-holder" autoComplete="cc-name" className={`lx-input ${errors.holder ? 'is-invalid' : ''}`} value={card.holder} onChange={(e) => setCardField('holder', e.target.value.toUpperCase())} />
                  </Field>
                  <div className="co-test">
                    <p className="co-test__title"><ShieldIcon size={15} /> Gateway de exemplo — use um cartão de teste</p>
                    <ul>
                      {TEST_CARDS.map((test) => (
                        <li key={test.number}>
                          <code>{test.number}</code>
                          <span className={`lx-badge ${test.result === 'approved' ? 'lx-badge--success' : 'lx-badge--danger'}`}>{test.label}</span>
                          <button
                            type="button"
                            className="lx-btn lx-btn--plain lx-btn--sm"
                            onClick={() => {
                              setCard({ number: test.number, expiry: '12/30', cvc: '123', holder: card.holder || form.name.toUpperCase() || 'CLIENTE TESTE' });
                              setErrors({ ...errors, number: undefined, expiry: undefined, cvc: undefined, holder: undefined });
                            }}
                          >
                            Usar
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="co-pix">
                  {pixReady ? (
                    <>
                      <div className="co-pix__qr"><PseudoQr seed={`${form.email}${plan.id}`} /></div>
                      <div className="co-pix__code">
                        <span>00020126580014BR.GOV.BCB.PIX0136LUMENU-TESTE-{plan.id.toUpperCase()}5204000053039865406{(plan.priceCents / 100).toFixed(2)}</span>
                        <button type="button" className="lx-btn lx-btn--plain lx-btn--sm" onClick={() => navigator.clipboard?.writeText('PIX-DE-TESTE-LUMENU')}><CopyIcon size={15} /> Copiar</button>
                      </div>
                      <p className="lx-hint">Ambiente de teste: nenhum Pix é cobrado. Simule a confirmação do banco abaixo.</p>
                    </>
                  ) : (
                    <p className="lx-hint">Geramos um QR Code Pix de {formatBRL(plan.priceCents)}. A confirmação é instantânea.</p>
                  )}
                </div>
              )}

              {message && <div className="lx-alert lx-alert--error" role="alert"><AlertIcon size={18} />{message}</div>}

              {method === 'pix' && !pixReady ? (
                <button type="button" className="lx-btn lx-btn--primary lx-btn--lg lx-btn--block" onClick={() => {
                  const found = validate();
                  setErrors(found);
                  if (Object.keys(found).length) setMessage('Confira os campos destacados.');
                  else { setMessage(''); setPixReady(true); }
                }}>
                  Gerar Pix de {formatBRL(plan.priceCents)}
                </button>
              ) : (
                <button type="submit" className="lx-btn lx-btn--primary lx-btn--lg lx-btn--block" disabled={submitting}>
                  {submitting ? <span className="lx-spinner" aria-label="Processando" /> : method === 'pix' ? 'Simular pagamento confirmado' : `Pagar ${formatBRL(plan.priceCents)} e criar conta`}
                </button>
              )}
              <p className="lx-hint" style={{ textAlign: 'center', margin: 0 }}>
                Ao assinar, você concorda com os <a href="/termos.html" target="_blank" rel="noopener">Termos de Uso</a> e a{' '}
                <a href="/privacidade.html" target="_blank" rel="noopener">Política de Privacidade</a>.
              </p>
            </div>
          </section>
          <p className="auth__foot" style={{ marginTop: 0 }}>Já tem conta? <Link to="/entrar">Entrar no painel</Link></p>
        </form>

        <aside className="co-summary">
          <div className="co-summary__plan">
            <small>Plano</small>
            <h3>{plan.name}</h3>
            <div className="co-summary__price">
              <strong>{formatBRL(plan.priceCents)}</strong>
              <span>/mês</span>
            </div>
          </div>
          <ul>
            {Object.entries(plan.features).filter(([, on]) => on).map(([key]) => (
              <li key={key}><CheckIcon size={18} />{FEATURE_LABELS[key]}</li>
            ))}
            {EXTRAS.map((extra) => <li key={extra}><CheckIcon size={18} />{extra}</li>)}
          </ul>
          <div className="co-summary__total"><span>Total hoje</span><strong>{formatBRL(plan.priceCents)}</strong></div>
          <p className="co-summary__note">Cobrança mensal. Gateway de exemplo: nenhuma cobrança real é feita.</p>
        </aside>
      </div>
    </div>
  );
}
