import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { AlertIcon, BookIcon, CheckIcon, CloseIcon, UsersIcon } from '../icons.jsx';
import { SButton, scrollToAnchor } from './SButton.jsx';
import { useCart } from './cart.jsx';
import { useSite } from './SiteContext.jsx';

/**
 * "Estou no restaurante": o cliente informa o número da mesa e escolhe entre chamar um atendente
 * ou pedir pelo cardápio (o pedido vai direto para a mesa).
 */
export function TableServiceModal({ open, onClose, initialTable = '' }) {
  const { site, slug, t } = useSite();
  const cart = useCart();
  const [input, setInput] = useState(initialTable);
  const [table, setTable] = useState(cart.table?.label ?? null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [called, setCalled] = useState(false);

  useEffect(() => {
    if (open) {
      setTable(cart.table?.label ?? null);
      setCalled(false);
      setError('');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Link direto da mesa (/<slug>/mesa/12): já confere o número.
  useEffect(() => {
    if (open && initialTable && !cart.table) check(initialTable);
  }, [open, initialTable]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function check(value) {
    setBusy(true);
    setError('');
    try {
      const data = await api.post(`s/${slug}/table/check`, { table: value });
      setTable(data.table);
    } catch {
      setError(t('table.notFound'));
    } finally {
      setBusy(false);
    }
  }

  const call = async () => {
    setBusy(true);
    try {
      await api.post(`s/${slug}/table/call`, { table });
      setCalled(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const order = () => {
    cart.enterTable(table);
    onClose();
    setTimeout(() => scrollToAnchor('#s-menu'), 50);
  };

  return (
    <div className="s-modal" role="dialog" aria-modal="true" aria-labelledby="s-table-title" onClick={onClose}>
      <div className="s-modal__card s-glass" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="s-modal__close" onClick={onClose} aria-label={t('auth.close')}><CloseIcon size={18} /></button>
        {!table ? (
          <form onSubmit={(e) => { e.preventDefault(); check(input); }} className="s-form">
            <h3 id="s-table-title">{t('table.title')}</h3>
            <p className="s-muted">{t('table.hint')}</p>
            <label className="s-field">
              <span>{t('table.label')}</span>
              <input className="s-input s-input--big" value={input} onChange={(e) => setInput(e.target.value)} autoFocus inputMode="text" maxLength={10} />
            </label>
            {error && <div className="s-alert" role="alert"><AlertIcon size={18} />{error}</div>}
            <SButton type="submit" size="lg" block loading={busy} disabled={!input.trim()}>{t('table.check')}</SButton>
          </form>
        ) : (
          <div className="s-form">
            <span className="s-eyebrow">{t('table.welcome', { table })}</span>
            <h3 id="s-table-title">{t('table.choose')}</h3>
            {called && <div className="s-alert s-alert--ok" role="status"><CheckIcon size={18} />{t('table.called')}</div>}
            {error && <div className="s-alert" role="alert"><AlertIcon size={18} />{error}</div>}
            <div className="s-choices">
              {site.tableService.call && (
                <button type="button" className="s-choice" onClick={call} disabled={busy}>
                  <span className="s-choice__icon"><UsersIcon size={22} /></span>
                  <span><strong>{called ? t('table.callAgain') : t('table.call')}</strong><small>{t('table.callText')}</small></span>
                </button>
              )}
              {site.tableService.orders && (
                <button type="button" className="s-choice" onClick={order}>
                  <span className="s-choice__icon"><BookIcon size={22} /></span>
                  <span><strong>{t('table.order')}</strong><small>{t('table.orderText')}</small></span>
                </button>
              )}
            </div>
            {cart.table && (
              <button type="button" className="s-link" onClick={() => { cart.leaveTable(); onClose(); }}>{t('table.leave')}</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
