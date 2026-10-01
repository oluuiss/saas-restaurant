import { createContext, useContext, useMemo } from 'react';
import { languageMeta, makeT, tr } from '../../shared/i18n.js';

const SiteContext = createContext(null);

/**
 * Tudo que o template precisa: o documento do site, o idioma e — no painel — as funções de edição.
 * `editing` liga a edição direta na tela; `update(path, value)` grava no rascunho.
 */
export function SiteProvider({ site, lang, setLang, editing = false, update, upload, openPanel, onTextFocus, slug, children }) {
  const value = useMemo(() => {
    const meta = languageMeta(lang);
    const currency = new Intl.NumberFormat(meta.locale, { style: 'currency', currency: 'BRL' });
    return {
      site,
      slug,
      lang,
      setLang,
      editing,
      update,
      upload,
      openPanel,
      onTextFocus,
      locale: meta.locale,
      t: makeT(lang),
      tx: (field) => tr(field, lang, site.defaultLanguage),
      formatPrice: (cents) => currency.format((cents ?? 0) / 100),
    };
  }, [site, slug, lang, setLang, editing, update, upload, openPanel, onTextFocus]);
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite precisa estar dentro de <SiteProvider>');
  return ctx;
}
