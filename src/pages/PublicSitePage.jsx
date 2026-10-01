import { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { languageMeta, makeT } from '../../shared/i18n.js';
import { api } from '../lib/api.js';
import { CartProvider } from '../site/cart.jsx';
import { CustomerProvider } from '../site/customer.jsx';
import Site from '../site/Site.jsx';
import { SiteProvider } from '../site/SiteContext.jsx';

const storageKey = (slug) => `lumenu.lang.${slug}`;

/**
 * Idioma inicial: o que o visitante escolheu antes, desde que o restaurante não tenha trocado o
 * idioma padrão depois disso. Senão, sempre o idioma padrão definido no painel.
 */
function pickLanguage(site, slug) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(slug)) ?? 'null');
    if (saved && saved.def === site.defaultLanguage && site.languages.includes(saved.lang)) return saved.lang;
  } catch {
    /* armazenamento indisponível */
  }
  return site.defaultLanguage;
}

/** Favicon padrão: a chama do template na cor de destaque do restaurante. */
const flameIcon = (accent) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${accent}" d="M12 2c1 3.6 6.5 6 6.5 11.4a6.5 6.5 0 0 1-13 0c0-3 1.5-5 3-6.4.2 1.9 1.1 3.2 2.6 3.8C10.8 8.2 11.3 5.2 12 2z"/></svg>`,
  )}`;

function setHead(site, lang) {
  document.title = site.brand.name;
  document.documentElement.lang = languageMeta(lang).locale;
  document.body.style.background = site.theme?.background ?? '#0f0b09';
  let icon = document.querySelector('link[rel="icon"]');
  if (!icon) {
    icon = document.createElement('link');
    icon.rel = 'icon';
    document.head.appendChild(icon);
  }
  icon.removeAttribute('type');
  icon.href = site.brand.favicon || site.brand.logo || flameIcon(site.theme?.accent ?? '#ff7a3d');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', site.theme?.background ?? '#0f0b09');
}

export default function PublicSitePage() {
  const { slug } = useParams();
  const { pathname } = useLocation();
  const rest = pathname.split('/').slice(2).filter(Boolean);
  const page = rest[0] === 'conta' ? 'account' : 'home';
  const tableParam = rest[0] === 'mesa' ? decodeURIComponent(rest[1] ?? '') : undefined;

  const [state, setState] = useState({ status: 'loading' });
  const [lang, setLangState] = useState('pt');

  useEffect(() => {
    let alive = true;
    api
      .get(`s/${slug}`)
      .then(({ site }) => {
        if (!alive) return;
        setLangState(pickLanguage(site, slug));
        setState({ status: 'ready', site });
      })
      .catch((error) => alive && setState({ status: error.status === 404 ? 'notfound' : 'error' }));
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    if (state.status === 'ready') setHead(state.site, lang);
  }, [state, lang]);

  const setLang = useCallback(
    (code) => {
      setLangState(code);
      try {
        localStorage.setItem(storageKey(slug), JSON.stringify({ lang: code, def: state.site?.defaultLanguage }));
      } catch {
        /* armazenamento indisponível */
      }
    },
    [slug, state.site],
  );

  if (state.status === 'loading') {
    return (
      <div className="lx-public-state">
        <span className="lx-spinner lx-spinner--light" aria-label="Carregando" />
      </div>
    );
  }

  if (state.status !== 'ready') {
    const t = makeT((navigator.language || 'pt').slice(0, 2));
    return (
      <div className="lx-public-state">
        <h1>{state.status === 'notfound' ? t('notFound.title') : 'Ops!'}</h1>
        <p>{state.status === 'notfound' ? t('notFound.text') : 'Não foi possível carregar este site agora. Tente novamente em instantes.'}</p>
      </div>
    );
  }

  return (
    <SiteProvider site={state.site} lang={lang} setLang={setLang} slug={slug}>
      <CustomerProvider slug={slug}>
        <CartProvider slug={slug} site={state.site}>
          <Site page={page} tableParam={tableParam} />
        </CartProvider>
      </CustomerProvider>
    </SiteProvider>
  );
}
