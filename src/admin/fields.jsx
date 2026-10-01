import { useRef, useState } from 'react';
import { languageMeta, tr } from '../../shared/i18n.js';
import { getIn } from '../lib/paths.js';
import Flag from '../Flag.jsx';
import { ArrowLeftIcon, ImageIcon, TrashIcon } from '../icons.jsx';
import { Field } from '../ui.jsx';
import { useAdmin } from './AdminContext.jsx';

let uid = 0;
const nextId = () => `f${++uid}`;

export function PanelHeader({ title, description, onBack }) {
  const { setPanel } = useAdmin();
  return (
    <header className="adm-panel__head">
      <button type="button" className="adm-back" onClick={onBack ?? (() => setPanel(null))}>
        <ArrowLeftIcon size={18} /> Voltar
      </button>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </header>
  );
}

export function Section({ title, children, aside }) {
  return (
    <section className="adm-section">
      {(title || aside) && (
        <div className="adm-section__head">
          {title && <h3>{title}</h3>}
          {aside}
        </div>
      )}
      <div className="adm-section__body">{children}</div>
    </section>
  );
}

/** Mostra em qual idioma o campo está sendo editado. */
export function LangChip() {
  const { editLang } = useAdmin();
  const meta = languageMeta(editLang);
  return (
    <span className="adm-langchip" title={`Editando em ${meta.name}`}>
      <Flag country={meta.country} size={16} light /> {meta.code.toUpperCase()}
    </span>
  );
}

/** Campo de texto traduzível: edita o idioma selecionado no topo do painel. */
export function TField({ path, label, multiline = false, placeholder, max = 400 }) {
  const { draft, update, editLang } = useAdmin();
  const [id] = useState(nextId);
  const field = getIn(draft, path);
  const value = field?.[editLang] ?? '';
  const fallback = tr(field, editLang, draft.defaultLanguage);
  const props = {
    id,
    className: multiline ? 'lx-textarea' : 'lx-input',
    value,
    maxLength: max,
    placeholder: fallback && !value ? fallback : placeholder,
    onChange: (e) => update([...path, editLang], e.target.value),
  };
  return (
    <div className="lx-field">
      <label htmlFor={id} className="lx-label adm-label-row">
        <span>{label}</span>
        {draft.languages.length > 1 && <LangChip />}
      </label>
      {multiline ? <textarea rows={3} {...props} /> : <input {...props} />}
    </div>
  );
}

/** Campo de texto simples (não traduzível). */
export function PField({ path, label, placeholder, type = 'text', hint, optional, max = 160, inputMode, autoComplete }) {
  const { draft, update } = useAdmin();
  const [id] = useState(nextId);
  return (
    <Field id={id} label={label} hint={hint} optional={optional}>
      <input
        id={id}
        type={type}
        className="lx-input"
        value={getIn(draft, path) ?? ''}
        maxLength={max}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete ?? 'off'}
        onChange={(e) => update(path, e.target.value)}
      />
    </Field>
  );
}

/** Foto com prévia, enviar/trocar e remover. */
export function ImageField({ path, label, hint, options, shape = 'wide', dark = false, removable = true }) {
  const { draft, update, upload } = useAdmin();
  const url = getIn(draft, path);
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const choose = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      update(path, await upload(file, options));
    } catch (err) {
      setError(err.message || 'Não foi possível enviar a foto.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-image">
      <div className={`adm-image__preview is-${shape} ${dark ? 'is-dark' : ''}`}>
        {url ? <img src={url} alt="" /> : <ImageIcon size={22} />}
        {busy && <span className="adm-image__busy"><span className="lx-spinner lx-spinner--blue" /></span>}
      </div>
      <div className="adm-image__info">
        <strong>{label}</strong>
        {hint && <span className="lx-hint">{hint}</span>}
        {error && <span className="lx-error">{error}</span>}
        <div className="adm-image__actions">
          <button type="button" className="lx-btn lx-btn--secondary lx-btn--sm" disabled={busy} onClick={() => input.current?.click()}>
            {url ? 'Trocar' : 'Enviar foto'}
          </button>
          {url && removable && (
            <button type="button" className="lx-btn lx-btn--plain lx-btn--sm adm-danger-text" onClick={() => update(path, null)} title="Remover">
              <TrashIcon size={15} />
            </button>
          )}
        </div>
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={choose} />
    </div>
  );
}
