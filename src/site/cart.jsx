import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { quoteOrder } from '../../shared/pricing.js';
import { digitsOnly } from '../../shared/payments.js';
import { api } from '../lib/api.js';
import { AlertIcon, CardIcon, CheckIcon, CloseIcon, MinusIcon, PlusIcon, StoreIcon, TrashIcon, TruckIcon } from '../icons.jsx';
import { SButton } from './SButton.jsx';
import { useCustomer } from './customer.jsx';
import { useSite } from './SiteContext.jsx';

const CartContext = createContext(null);

const PREVIEW = { preview: true, lines: [], count: 0, table: null, add: () => {}, open: () => {}, isOpen: false, enterTable: () => {}, leaveTable: () => {} };

const read = (storage, key, fallback) => {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const write = (storage, key, value) => {
  try {
    if (value == null) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify(value));
  } catch {
    /* armazenamento indisponível */
  }
};

/**
 * Carrinho do site. Fora do restaurante é delivery; depois de informar a mesa ("Estou no restaurante")
 * o pedido vai para a mesa. O carrinho fica salvo no navegador.
 */
export function CartProvider({ slug, site, children }) {
  const cartKey = `lumenu.cart.${slug}`;
  const tableKey = `lumenu.table.${slug}`;
  const [lines, setLines] = useState(() => read(localStorage, cartKey, []));
  const [table, setTable] = useState(() => read(sessionStorage, tableKey, null));
  const [code, setCode] = useState('');
  const [isOpen, setOpen] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => write(localStorage, cartKey, lines), [cartKey, lines]);
  useEffect(() => write(sessionStorage, tableKey, table), [tableKey, table]);

  // Remove do carrinho pratos que não existem mais no cardápio publicado.
  useEffect(() => {
    const ids = new Set(site.menu.items.map((i) => i.id));
    setLines((ls) => (ls.every((l) => ids.has(l.itemId)) ? ls : ls.filter((l) => ids.has(l.itemId))));
  }, [site.menu.items]);

  const mode = table ? 'table' : 'delivery';
  const quote = useMemo(() => quoteOrder(site, { lines, mode, code }), [site, lines, mode, code]);

  const add = useCallback((itemId) => {
    setLines((ls) => (ls.some((l) => l.itemId === itemId) ? ls.map((l) => (l.itemId === itemId ? { ...l, qty: Math.min(50, l.qty + 1) } : l)) : [...ls, { itemId, qty: 1 }]));
    setToast({ itemId, at: Date.now() });
  }, []);
  const setQty = useCallback((itemId, qty) => setLines((ls) => (qty <= 0 ? ls.filter((l) => l.itemId !== itemId) : ls.map((l) => (l.itemId === itemId ? { ...l, qty } : l)))), []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const value = {
    lines,
    count: lines.reduce((n, l) => n + l.qty, 0),
    quote,
    mode,
    table,
    code,
    setCode,
    add,
    setQty,
    clear: () => {
      setLines([]);
      setCode('');
    },
    isOpen,
    open: () => setOpen(true),
    close: () => setOpen(false),
    enterTable: (label) => setTable({ label }),
    leaveTable: () => setTable(null),
    toast,
  };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext) ?? PREVIEW;

/* ---------- Gaveta do carrinho ---------- */

function Totals({ quote, mode }) {
  const { t, formatPrice } = useSite();
  return (
    <dl className="s-totals">
      <div><dt>{t('cart.subtotal')}</dt><dd>{formatPrice(quote.subtotal)}</dd></div>
      {quote.discount > 0 && <div className="is-discount"><dt>{t('cart.discount')}</dt><dd>−{formatPrice(quote.discount)}</dd></div>}
      {mode === 'delivery' && <div><dt>{t('cart.delivery')}</dt><dd>{quote.deliveryFee ? formatPrice(quote.deliveryFee) : t('cart.free')}</dd></div>}
      <div className="is-total"><dt>{t('cart.total')}</dt><dd>{formatPrice(quote.total)}</dd></div>
    </dl>
  );
}

const formatCard = (v) => digitsOnly(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
const formatExpiry = (v) => {
  const d = digitsOnly(v).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

export function CartDrawer() {
  const { site, slug, t, tx, formatPrice } = useSite();
  const cart = useCart();
  const { customer, requireLogin } = useCustomer();
  const navigate = useNavigate();
  const [step, setStep] = useState('cart');
  const [couponInput, setCouponInput] = useState('');
  const [address, setAddress] = useState(() => read(localStorage, `lumenu.address.${slug}`, { street: '', complement: '', district: '', city: '', reference: '' }));
  const [notes, setNotes] = useState('');
  const [payment, setPayment] = useState(site.delivery.payOnDelivery ? 'on_delivery' : 'online');
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', holder: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (cart.isOpen) {
      setStep(order ? 'done' : 'cart');
      setMessage('');
    } else if (order) {
      setOrder(null);
    }
  }, [cart.isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Andamento do pedido feito na mesa (atualiza sozinho).
  useEffect(() => {
    if (!order || order.type !== 'table' || ['delivered', 'canceled'].includes(order.status)) return undefined;
    const timer = setInterval(() => {
      api.get(`s/${slug}/orders/${order.id}`).then((d) => setOrder(d.order)).catch(() => {});
    }, 10_000);
    return () => clearInterval(timer);
  }, [order, slug]);

  if (!cart.isOpen) return null;

  const { quote, mode } = cart;
  const isTable = mode === 'table';
  const deliveryOff = !isTable && !site.delivery.enabled;
  const belowMin = quote.errors.includes('minOrder');
  const itemsById = new Map(site.menu.items.map((i) => [i.id, i]));

  const goCheckout = () => {
    if (isTable) setStep('checkout');
    else requireLogin(t('cart.loginToOrder'), () => setStep('checkout'));
  };

  const place = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage('');
    try {
      const body = {
        mode,
        lines: cart.lines,
        code: cart.code || undefined,
        notes,
        ...(isTable ? { table: cart.table.label } : { address, payment: payment === 'online' ? { method: 'online', card } : { method: 'on_delivery' } }),
      };
      const { order: created } = await api.post(`s/${slug}/orders`, body);
      if (!isTable) write(localStorage, `lumenu.address.${slug}`, address);
      cart.clear();
      setOrder(created);
      setStep('done');
    } catch (err) {
      setErrors(err.fields ?? {});
      setMessage(err.status === 401 ? t('cart.loginToOrder') : err.message || t('cart.error'));
    } finally {
      setBusy(false);
    }
  };

  const addressField = (key, required) => (
    <label className="s-field">
      <span>{t(`cart.${key}`)}</span>
      <input className={`s-input ${errors[key] ? 'is-invalid' : ''}`} value={address[key]} required={required} onChange={(e) => setAddress({ ...address, [key]: e.target.value })} />
      {errors[key] && <small className="s-field__error">{errors[key]}</small>}
    </label>
  );

  return (
    <div className="s-sheet" role="dialog" aria-modal="true" aria-labelledby="s-cart-title" onClick={cart.close}>
      <aside className="s-sheet__panel s-glass" onClick={(e) => e.stopPropagation()}>
        <header className="s-sheet__head">
          <div>
            <h3 id="s-cart-title">{step === 'done' ? t('cart.successTitle') : isTable ? t('cart.tableTitle', { table: cart.table.label }) : t('cart.title')}</h3>
            {step !== 'done' && (
              <span className="s-muted s-sheet__mode">
                {isTable ? <StoreIcon size={15} /> : <TruckIcon size={15} />}
                {isTable ? t('table.welcome', { table: cart.table.label }) : t('cart.estimate', { min: site.delivery.estimateMin, max: site.delivery.estimateMax })}
              </span>
            )}
          </div>
          <button type="button" className="s-modal__close" onClick={cart.close} aria-label={t('auth.close')}><CloseIcon size={18} /></button>
        </header>

        {step === 'done' && order ? (
          <div className="s-sheet__body s-order-done">
            <span className="s-booking-success__icon"><CheckIcon size={28} /></span>
            <p>{isTable || order.type === 'table' ? t('cart.successTable', { number: order.number }) : t('cart.successText', { number: order.number })}</p>
            <ol className="s-steps">
              {(order.type === 'table' ? ['received', 'preparing', 'ready', 'delivered'] : ['received', 'preparing', 'out_for_delivery', 'delivered']).map((s, i, all) => (
                <li key={s} className={all.indexOf(order.status) >= i ? 'is-done' : ''}>{t(`orders.status.${s}`)}</li>
              ))}
            </ol>
            <p className="s-totals__big">{formatPrice(order.total)}</p>
            {order.type === 'delivery' && (
              <SButton block onClick={() => { cart.close(); navigate(`/${slug}/conta`); }}>{t('cart.view')}</SButton>
            )}
            <SButton variant="glass" block onClick={cart.close}>{t('cart.continue')}</SButton>
          </div>
        ) : !cart.lines.length ? (
          <div className="s-sheet__body s-empty">
            <strong>{t('cart.empty')}</strong>
            <span className="s-muted">{t('cart.emptyHint')}</span>
            <SButton variant="glass" onClick={cart.close}>{t('cart.continue')}</SButton>
          </div>
        ) : step === 'cart' ? (
          <>
            <div className="s-sheet__body">
              <ul className="s-cart">
                {quote.lines.map((line) => {
                  const item = itemsById.get(line.itemId);
                  return (
                    <li key={line.itemId}>
                      {item?.image ? <img src={item.image} alt="" /> : <span className="s-cart__thumb" />}
                      <div className="s-cart__info">
                        <strong>{tx(line.name)}</strong>
                        <span>
                          {line.unit < line.original && <s>{formatPrice(line.original)}</s>} {formatPrice(line.unit)}
                        </span>
                      </div>
                      <div className="s-qty">
                        <button type="button" aria-label={t('cart.decrease')} onClick={() => cart.setQty(line.itemId, line.qty - 1)}>
                          {line.qty === 1 ? <TrashIcon size={15} /> : <MinusIcon size={15} />}
                        </button>
                        <span>{line.qty}</span>
                        <button type="button" aria-label={t('cart.increase')} onClick={() => cart.setQty(line.itemId, line.qty + 1)}><PlusIcon size={15} /></button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <form className="s-coupon" onSubmit={(e) => { e.preventDefault(); cart.setCode(couponInput.trim()); }}>
                <input className="s-input" placeholder={t('cart.coupon')} value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} />
                <SButton type="submit" variant="glass">{t('cart.apply')}</SButton>
              </form>
              {quote.coupon && (
                <p className={`s-coupon__msg ${quote.coupon.applied ? 'is-ok' : ''}`}>
                  {!quote.coupon.valid ? t('cart.couponInvalid') : quote.coupon.applied ? t('cart.couponApplied', { code: quote.coupon.code }) : t('cart.couponNotBest')}
                </p>
              )}
              {quote.promo && !quote.promo.code && <p className="s-coupon__msg is-ok">{tx(quote.promo.title)}</p>}
            </div>
            <footer className="s-sheet__foot">
              <Totals quote={quote} mode={mode} />
              {deliveryOff && <div className="s-alert"><AlertIcon size={18} />{t('cart.deliveryOff')}</div>}
              {belowMin && <div className="s-alert"><AlertIcon size={18} />{t('cart.minOrder', { amount: formatPrice(site.delivery.minOrder) })}</div>}
              <SButton size="lg" block disabled={deliveryOff || belowMin} onClick={goCheckout}>{t('cart.next')}</SButton>
            </footer>
          </>
        ) : (
          <form className="s-sheet__form" onSubmit={place}>
            <div className="s-sheet__body">
              {!isTable && (
                <>
                  <h4 className="s-sheet__section">{t('cart.deliveryTitle')}</h4>
                  <div className="s-form">
                    {addressField('street', true)}
                    <div className="s-form__row">{addressField('complement')}{addressField('district', true)}</div>
                    <div className="s-form__row">{addressField('city')}{addressField('reference')}</div>
                  </div>
                </>
              )}
              <label className="s-field">
                <span>{t('cart.notes')}</span>
                <textarea className="s-input s-textarea" rows={2} placeholder={t('cart.notesPlaceholder')} value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} />
              </label>

              <h4 className="s-sheet__section">{t('cart.payment')}</h4>
              {isTable ? (
                <div className="s-pay is-active"><StoreIcon size={20} /><span><strong>{t('cart.payAtTable')}</strong><small>{t('cart.payAtTableText')}</small></span></div>
              ) : (
                <div className="s-pays">
                  {site.delivery.payOnDelivery && (
                    <button type="button" className={`s-pay ${payment === 'on_delivery' ? 'is-active' : ''}`} onClick={() => setPayment('on_delivery')}>
                      <TruckIcon size={20} /><span><strong>{t('cart.payOnDelivery')}</strong><small>{t('cart.payOnDeliveryText')}</small></span>
                    </button>
                  )}
                  {site.delivery.payOnline && (
                    <button type="button" className={`s-pay ${payment === 'online' ? 'is-active' : ''}`} onClick={() => setPayment('online')}>
                      <CardIcon size={20} /><span><strong>{t('cart.payOnline')}</strong><small>{t('cart.payOnlineText')}</small></span>
                    </button>
                  )}
                </div>
              )}
              {!isTable && payment === 'online' && (
                <div className="s-form">
                  <label className="s-field">
                    <span>{t('cart.cardNumber')}</span>
                    <input className={`s-input ${errors.number ? 'is-invalid' : ''}`} inputMode="numeric" autoComplete="cc-number" value={card.number} onChange={(e) => setCard({ ...card, number: formatCard(e.target.value) })} />
                    {errors.number && <small className="s-field__error">{errors.number}</small>}
                  </label>
                  <div className="s-form__row">
                    <label className="s-field"><span>{t('cart.expiry')}</span><input className={`s-input ${errors.expiry ? 'is-invalid' : ''}`} inputMode="numeric" autoComplete="cc-exp" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })} /></label>
                    <label className="s-field"><span>{t('cart.cvc')}</span><input className={`s-input ${errors.cvc ? 'is-invalid' : ''}`} inputMode="numeric" autoComplete="cc-csc" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: digitsOnly(e.target.value).slice(0, 4) })} /></label>
                  </div>
                  <label className="s-field"><span>{t('cart.holder')}</span><input className={`s-input ${errors.holder ? 'is-invalid' : ''}`} autoComplete="cc-name" value={card.holder} onChange={(e) => setCard({ ...card, holder: e.target.value.toUpperCase() })} /></label>
                </div>
              )}
            </div>
            <footer className="s-sheet__foot">
              <Totals quote={quote} mode={mode} />
              {message && <div className="s-alert" role="alert"><AlertIcon size={18} />{message}</div>}
              <SButton type="submit" size="lg" block loading={busy}>{busy ? t('cart.placing') : t('cart.place', { amount: formatPrice(quote.total) })}</SButton>
              <button type="button" className="s-link" onClick={() => setStep('cart')}>{t('cart.back')}</button>
            </footer>
          </form>
        )}
      </aside>
    </div>
  );
}
