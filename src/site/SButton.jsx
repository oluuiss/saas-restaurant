import { useSite } from './SiteContext.jsx';

/** Rola até uma âncora do site (funciona também dentro da prévia do painel, que tem rolagem própria). */
export function scrollToAnchor(hash) {
  document.getElementById(hash.replace('#', ''))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Botão "liquid glass" do template Brasa Grill.
 * Com `href` vira link; no painel vira <span> para que o texto dentro possa ser editado.
 */
export function SButton({ variant = 'primary', size = 'md', block = false, loading = false, icon, href, className = '', children, onClick, ...rest }) {
  const { editing } = useSite();
  const classes = ['s-btn', `s-btn--${variant}`, `s-btn--${size}`, block && 's-btn--block', className].filter(Boolean).join(' ');
  const content = (
    <>
      {loading ? <span className="s-btn__spinner" aria-hidden="true" /> : icon}
      {children && <span>{children}</span>}
    </>
  );

  if (href && editing) return <span className={classes}>{content}</span>;
  if (href) {
    const internal = href.startsWith('#');
    return (
      <a
        href={href}
        className={classes}
        target={internal ? undefined : '_blank'}
        rel={internal ? undefined : 'noopener noreferrer'}
        onClick={(e) => {
          if (internal) {
            e.preventDefault();
            scrollToAnchor(href);
          }
          onClick?.(e);
        }}
        {...rest}
      >
        {content}
      </a>
    );
  }
  return (
    <button type="button" className={classes} onClick={onClick} {...rest} disabled={loading || rest.disabled} aria-busy={loading || undefined}>
      {content}
    </button>
  );
}
