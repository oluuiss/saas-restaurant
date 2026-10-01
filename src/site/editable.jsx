import { createElement, useLayoutEffect, useRef, useState } from 'react';
import { getIn } from '../lib/paths.js';
import { CameraIcon } from '../icons.jsx';
import { useSite } from './SiteContext.jsx';

const clean = (text, multiline) => {
  const value = text.replace(/ /g, ' ').replace(/\n$/, '');
  return multiline ? value : value.replace(/\s*\n\s*/g, ' ');
};

/**
 * Chave estável de um texto para guardar o estilo dele: posições em listas viram o id do item,
 * ex.: ['menu','items',3,'name'] → "menu.items.ab12cd34.name".
 */
export function textKey(site, path) {
  let node = site;
  return path
    .map((part) => {
      const child = node?.[part];
      const key = typeof part === 'number' && child?.id ? child.id : part;
      node = child;
      return key;
    })
    .join('.');
}

/** Estilo salvo (cor, gradiente, animação, tamanho) → props do <span> do texto. */
export function textStyleProps(style) {
  if (!style) return { className: '', style: undefined };
  const css = {};
  let className = '';
  if (style.size && style.size !== 100) css.fontSize = `${style.size / 100}em`;
  if (style.mode === 'solid' && style.color) {
    css.color = style.color;
    css.WebkitTextFillColor = style.color;
    css.caretColor = style.color;
  } else if ((style.mode === 'gradient' || style.mode === 'animated') && style.color) {
    css['--ts-a'] = style.color;
    css['--ts-b'] = style.color2 || style.color;
    className = style.mode === 'animated' ? 'ts-grad ts-anim' : 'ts-grad';
  }
  return { className, style: Object.keys(css).length ? css : undefined };
}

/**
 * Texto editável no lugar (contentEditable não controlado, para o cursor não pular).
 * Enter confirma (ou quebra linha, se `multiline`), Esc sai da edição.
 */
export function EditableText({ value, onChange, onCommit, onFocus, as = 'span', multiline = false, placeholder = 'Clique para escrever', className = '', style, label }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerText !== (value ?? '')) el.innerText = value ?? '';
  }, [value]);

  return createElement(as, {
    ref,
    className: `ed-text ${className}`,
    style,
    contentEditable: true,
    suppressContentEditableWarning: true,
    role: 'textbox',
    'aria-label': label ?? placeholder,
    'aria-multiline': multiline || undefined,
    'data-placeholder': placeholder,
    spellCheck: true,
    onFocus: (e) => onFocus?.(e.currentTarget),
    onInput: (e) => onChange?.(clean(e.currentTarget.innerText, multiline)),
    onBlur: (e) => onCommit?.(clean(e.currentTarget.innerText, multiline)),
    onKeyDown: (e) => {
      if (e.key === 'Escape' || (e.key === 'Enter' && !multiline)) {
        e.preventDefault();
        e.currentTarget.blur();
      }
    },
    onPaste: (e) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, multiline ? text : text.replace(/\s+/g, ' '));
    },
    // Dentro de links/botões do template, clicar deve editar e não navegar.
    onClick: (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
  });
}

/**
 * Texto do site. `path` aponta para um campo traduzível ({ pt, en, de }); com `plain`, para uma string.
 * O elemento externo (`as` + `className`) mantém o visual do template; o <span> interno recebe o
 * estilo próprio do texto (cor, gradiente, tamanho em "em", ou seja, relativo ao tamanho original).
 */
export function Text({ path, as = 'span', className = '', multiline = false, plain = false, placeholder }) {
  const { site, lang, editing, update, tx, onTextFocus } = useSite();
  const field = getIn(site, path);
  const key = textKey(site, path);
  const custom = textStyleProps(site.textStyles?.[key]);

  if (!editing) {
    const value = plain ? field ?? '' : tx(field);
    if (!value) return null;
    if (!custom.style && !custom.className) return createElement(as, { className }, value);
    return createElement(as, { className }, <span className={`ts ${custom.className}`} style={custom.style}>{value}</span>);
  }

  const value = plain ? field ?? '' : field?.[lang] ?? '';
  const hint = plain ? placeholder : tx(field) || placeholder;
  return createElement(
    as,
    { className },
    <EditableText
      className={`ts ${custom.className}`}
      style={custom.style}
      multiline={multiline}
      value={value}
      placeholder={hint || 'Clique para escrever'}
      onFocus={(el) => onTextFocus?.(key, el)}
      onChange={(v) => update(plain ? path : [...path, lang], v)}
    />,
  );
}

const toInput = (cents) => ((cents ?? 0) / 100).toFixed(2).replace('.', ',');

/** "1.234,50" | "1234.5" | "R$ 89,90" → centavos */
export function parseMoney(text) {
  let s = String(text).replace(/[^\d.,]/g, '');
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** Preço em centavos; no painel edita o número e grava ao sair do campo. */
export function Price({ path, className = '' }) {
  const { site, editing, update, formatPrice } = useSite();
  const cents = getIn(site, path);
  if (!editing) return <span className={className}>{formatPrice(cents)}</span>;
  return (
    <span className={`${className} ed-price`}>
      <span aria-hidden="true">R$ </span>
      <EditableText value={toInput(cents)} label="Preço" placeholder="0,00" onCommit={(v) => update(path, parseMoney(v))} />
    </span>
  );
}

/** Botão "Trocar foto" que envia a imagem e grava a URL em `path`. */
export function ImageButton({ path, options, label = 'Trocar foto', className = '', compact = false }) {
  const { update, upload } = useSite();
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
    <>
      <button
        type="button"
        className={`ed-photo ${compact ? 'ed-photo--compact' : ''} ${className}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          input.current?.click();
        }}
        disabled={busy}
        title={error || label}
      >
        {busy ? <span className="ed-spinner" aria-hidden="true" /> : <CameraIcon size={16} />}
        {!compact && <span>{busy ? 'Enviando…' : error ? 'Tentar de novo' : label}</span>}
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={choose} />
    </>
  );
}

/** Contêiner de imagem: no painel ganha o botão de trocar foto por cima. */
export function ImageSlot({ path, options, as = 'div', className = '', style, children, label }) {
  const { editing } = useSite();
  return createElement(
    as,
    { className: `${className} ${editing ? 'ed-slot' : ''}`, style },
    children,
    editing && <ImageButton key="ed" path={path} options={options} label={label} />,
  );
}
