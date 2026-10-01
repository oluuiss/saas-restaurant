import { useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { allTables } from '../../shared/floor.js';
import { orderedLanguages } from '../../shared/i18n.js';
import { activePromotions, itemDeal, promoBadge } from '../../shared/pricing.js';
import { DEFAULT_THEME, newId, nowInTimezone, weekdayOf } from '../../shared/site.js';
import Flag from '../Flag.jsx';
import {
  ArrowRightIcon, BagIcon, ClockIcon, CloseIcon, CopyIcon, EyeIcon, EyeOffIcon, FlameIcon, GlassIcon, InstagramIcon, KnifeIcon,
  LayoutIcon, MailIcon, MapPinIcon, PhoneIcon, PlusIcon, StarIcon, StoreIcon, TagIcon, TrashIcon, TruckIcon, WhatsAppIcon,
} from '../icons.jsx';
import AccountPage from './AccountPage.jsx';
import Booking from './Booking.jsx';
import { CartDrawer, useCart } from './cart.jsx';
import { AuthModal, useCustomer } from './customer.jsx';
import { ImageSlot, ImageButton, Price, Text } from './editable.jsx';
import { SButton, scrollToAnchor } from './SButton.jsx';
import { useSite } from './SiteContext.jsx';
import { TableServiceModal } from './TableService.jsx';
import './site.css';
import './site-extra.css';

const LUMENU_URL = import.meta.env.VITE_LUMENU_URL;

const cssUrl = (url) => (url ? `url("${url}")` : 'none');
const digits = (v) => String(v ?? '').replace(/\D/g, '');
const waNumber = (v) => (digits(v).length <= 11 ? `55${digits(v)}` : digits(v));
const handle = (v) => String(v ?? '').replace(/^@/, '');

/* ---------- Cores ---------- */

function hexToRgb(hex, fallback = '#ff7a3d') {
  const value = /^#[0-9a-f]{6}$/i.test(hex ?? '') ? hex : fallback;
  const n = parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mixRgb = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const css = (rgb) => `rgb(${rgb.join(' ')})`;
const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];
const luminance = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/** Variáveis de cor do site a partir das cores escolhidas no painel. Fundo claro troca o texto para escuro. */
export function themeStyle(theme = {}) {
  const t = { ...DEFAULT_THEME, ...theme };
  const accent = hexToRgb(t.accent);
  const bg = hexToRgb(t.background, DEFAULT_THEME.background);
  const light = luminance(bg) > 0.55;
  const glow = t.glow ? hexToRgb(t.glow) : null;
  const sel = hexToRgb(t.tableSelected);
  // Em fundo claro, tons muito claros (como o dourado padrão) escurecem para continuar legíveis.
  const readable = (rgb) => (light && luminance(rgb) > 0.55 ? mixRgb(rgb, BLACK, 0.38) : rgb);
  const gold = readable(hexToRgb(t.gold, DEFAULT_THEME.gold));
  const price = readable(hexToRgb(t.price, DEFAULT_THEME.price));
  return {
    light,
    style: {
      '--ember': css(accent),
      '--ember-rgb': accent.join(' '),
      '--ember-light': css(mixRgb(accent, WHITE, 0.28)),
      '--ember-strong': css(mixRgb(accent, BLACK, 0.14)),
      '--bg': css(bg),
      '--bg-rgb': bg.join(' '),
      '--bg-elevated': css(mixRgb(bg, light ? BLACK : WHITE, 0.06)),
      '--bar-rgb': (light ? WHITE : mixRgb(bg, WHITE, 0.1)).join(' '),
      '--glow-rgb': (glow ?? accent).join(' '),
      '--glow-a': glow ? 1 : 0,
      '--wine': css(mixRgb(glow ?? accent, bg, 0.6)),
      '--wine-rgb': mixRgb(glow ?? accent, bg, 0.6).join(' '),
      '--gold': css(gold),
      '--gold-rgb': gold.join(' '),
      '--price': css(price),
      '--sel': css(sel),
      '--sel-light': css(mixRgb(sel, WHITE, 0.3)),
      '--sel-strong': css(mixRgb(sel, BLACK, 0.18)),
      '--sel-rgb': sel.join(' '),
    },
  };
}

export default function Site({ page = 'home', tableParam }) {
  const { site, editing } = useSite();
  const { light, style } = themeStyle(site.theme);
  const [tableOpen, setTableOpen] = useState(Boolean(tableParam));

  return (
    <div className={`site ${editing ? 'is-editing' : ''} ${light ? 'is-light' : ''}`} style={style}>
      <div className="site__frame">
      <SiteHeader page={page} />
      <main>
        {page === 'account' ? (
          <AccountPage />
        ) : (
          <>
            <Hero />
            <Promotions />
            <MenuSection onTable={() => setTableOpen(true)} />
            <Experience />
            <Visit />
            <Locations />
            <Reserve />
          </>
        )}
      </main>
      <SiteFooter page={page} />
      </div>
      {!editing && (
        <>
          <TableBanner onOpen={() => setTableOpen(true)} />
          <CartToast />
          <CartDrawer />
          <AuthModal />
          <TableServiceModal open={tableOpen} onClose={() => setTableOpen(false)} initialTable={tableParam} />
        </>
      )}
    </div>
  );
}

/* ---------- Marca ---------- */

/** Marca padrão do template (chama + serra), usada enquanto o restaurante não envia uma logo. */
function LogoMark({ size = 36 }) {
  const id = `lm${useId().replace(/[:«»]/g, '')}`;
  return (
    <svg className="s-logo__mark" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-f`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="var(--ember-strong)" /><stop offset="1" stopColor="var(--ember-light)" /></linearGradient>
        <linearGradient id={`${id}-c`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#ffc861" /><stop offset="1" stopColor="#fff1c9" /></linearGradient>
        <linearGradient id={`${id}-r`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fbf4ec" /><stop offset="1" stopColor="#d9c9b8" /></linearGradient>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--ember-strong)" /><stop offset="1" stopColor="#7d2a1e" /></linearGradient>
      </defs>
      <path d="M24 3.5c1.5 5.2 8.3 8.6 8.3 15.4 0 5-3.7 8.6-8.3 8.6s-8.3-3.6-8.3-8.6c0-3.4 1.8-5.8 3.6-7.3.3 2.3 1.4 3.8 3.1 4.6C21.8 11.7 22.8 7.6 24 3.5z" fill={`url(#${id}-f)`} />
      <path d="M24 15c.8 2.5 3.8 3.9 3.8 7.1a3.8 3.8 0 0 1-7.6 0c0-2 1.3-3.4 3.8-7.1z" fill={`url(#${id}-c)`} />
      <path d="M2 43 L16.5 21 L23.5 30 L29.5 22.5 L46 43 Z" fill={`url(#${id}-r)`} />
      <path d="M12.6 27 L16.5 21 L20.2 25.8 M26.6 26.2 L29.5 22.5 L33 27" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 43 L20 32.5 L25.5 37 L31 31.5 L40 43 Z" fill={`url(#${id}-b)`} />
    </svg>
  );
}

function BrandLogo({ onHome }) {
  const { site, editing } = useSite();
  const { name, logo, showName = true } = site.brand;
  const words = name.trim().split(/\s+/);
  const mark = logo ? <img className="s-logo__img" src={logo} alt="" /> : <LogoMark />;
  const label = editing ? (
    <Text plain path={['brand', 'name']} className="s-logo__text" placeholder="Nome do restaurante" />
  ) : (
    <span className="s-logo__text">
      {words.length > 1 ? <>{words.slice(0, -1).join(' ')} <span>{words.at(-1)}</span></> : name}
    </span>
  );

  const content = (
    <>
      {editing ? (
        <span className="s-logo__slot ed-slot">
          {mark}
          <ImageButton path={['brand', 'logo']} options={{ max: 512, keepAlpha: true }} compact label="Trocar logo" />
        </span>
      ) : (
        mark
      )}
      {(showName || !logo) && label}
    </>
  );

  if (editing) return <span className="s-logo">{content}</span>;
  return (
    <a className="s-logo" href="#s-top" aria-label={name} onClick={(e) => { e.preventDefault(); onHome(); }}>
      {content}
    </a>
  );
}

function LanguageSwitcher({ expanded = false }) {
  const { site, lang, setLang } = useSite();
  return (
    <div className={`s-lang ${expanded ? 's-lang--expanded' : ''}`} role="group">
      {orderedLanguages(site).map((l) => (
        <button key={l.code} type="button" className={`s-lang__btn ${l.code === lang ? 'is-active' : ''}`} aria-pressed={l.code === lang} title={l.name} lang={l.locale} onClick={() => setLang(l.code)}>
          <Flag country={l.country} size={expanded ? 24 : 21} />
          {expanded && <span>{l.name}</span>}
        </button>
      ))}
    </div>
  );
}

const reservationsVisible = (site, editing) => site.reservations?.enabled && (editing || allTables(site).length > 0);
const canOrder = (site, cart) => (cart.table ? site.tableService.enabled && site.tableService.orders : site.delivery.enabled);

function useGo(page) {
  const { slug, editing } = useSite();
  const navigate = useNavigate();
  return (hash) => {
    if (page !== 'home' && !editing) {
      navigate(`/${slug}`);
      setTimeout(() => scrollToAnchor(hash), 60);
    } else {
      scrollToAnchor(hash);
    }
  };
}

function SiteHeader({ page }) {
  const { site, slug, t, editing } = useSite();
  const { customer, openAuth } = useCustomer();
  const cart = useCart();
  const navigate = useNavigate();
  const go = useGo(page);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(editing);

  useEffect(() => {
    if (editing) return undefined;
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [editing]);

  const hasLocations = site.locations.some((l) => l.name || l.address);
  const links = [
    ['#s-menu', 'nav.menu'],
    activePromotions(site).length > 0 && ['#s-promos', 'nav.promos'],
    ['#s-about', 'nav.about'],
    hasLocations && ['#s-locations', 'nav.locations'],
  ].filter(Boolean);
  const reserve = reservationsVisible(site, editing);
  const multiLang = site.languages.length > 1;
  const showCart = editing ? site.delivery.enabled : canOrder(site, cart) || cart.count > 0;
  const initials = customer?.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const goAccount = () => {
    setOpen(false);
    if (customer) navigate(`/${slug}/conta`);
    else openAuth('login');
  };
  const link = (hash) => (e) => {
    e.preventDefault();
    setOpen(false);
    go(hash);
  };

  return (
    <header className={`s-header ${scrolled ? 'is-scrolled' : ''} ${open ? 'is-open' : ''}`}>
      <div className="s-header__bar s-glass">
        <BrandLogo onHome={() => go('#s-top')} />
        <nav className="s-header__nav">
          {links.map(([hash, key]) => (
            <a key={hash} href={hash} className="s-header__link" onClick={link(hash)}>{t(key)}</a>
          ))}
        </nav>
        <div className="s-header__actions">
          {multiLang && <div className="s-desktop-only"><LanguageSwitcher /></div>}
          {reserve && <SButton size="sm" href="#s-reserve" className="s-desktop-only" onClick={() => go('#s-reserve')}>{t('nav.reserve')}</SButton>}
          {showCart && (
            <button type="button" className="s-icon-btn" aria-label={`${t('nav.cart')} (${cart.count})`} onClick={editing ? undefined : cart.open}>
              <BagIcon size={20} />
              {cart.count > 0 && <span key={cart.count} className="s-icon-btn__badge">{cart.count}</span>}
            </button>
          )}
          {customer ? (
            <button type="button" className="s-avatar" onClick={goAccount} title={t('nav.account')}>{initials}</button>
          ) : (
            <SButton size="sm" variant="glass" className="s-signin" onClick={editing ? undefined : goAccount}>{t('nav.signIn')}</SButton>
          )}
          <button type="button" className={`s-header__burger ${open ? 'is-open' : ''}`} aria-label={open ? t('nav.close') : t('nav.open')} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <span />
            <span />
          </button>
        </div>
      </div>

      <div className={`s-drawer s-glass ${open ? 'is-open' : ''}`} inert={!open}>
        <nav className="s-drawer__links">
          {links.map(([hash, key]) => (
            <a key={hash} href={hash} className="s-drawer__link" onClick={link(hash)}>{t(key)}</a>
          ))}
          {!editing && (
            <a href={`/${slug}/conta`} className="s-drawer__link" onClick={(e) => { e.preventDefault(); goAccount(); }}>
              {customer ? t('nav.account') : t('nav.signIn')}
            </a>
          )}
        </nav>
        {multiLang && (
          <div className="s-drawer__section">
            <span className="s-drawer__label">{t('nav.language')}</span>
            <LanguageSwitcher expanded />
          </div>
        )}
        {reserve && <SButton size="lg" block href="#s-reserve" onClick={() => { setOpen(false); go('#s-reserve'); }}>{t('nav.reserve')}</SButton>}
      </div>
    </header>
  );
}

/* ---------- Seções ---------- */

function SectionHead({ base, children }) {
  return (
    <div className="s-section__head">
      <div>
        <Text path={[base, 'eyebrow']} className="s-eyebrow" placeholder="Rótulo" />
        <Text as="h2" path={[base, 'title']} className="s-section__title" placeholder="Título da seção" />
        <Text as="p" path={[base, 'lead']} className="s-section__lead" multiline placeholder="Texto de apoio" />
      </div>
      {children}
    </div>
  );
}

function Hero() {
  const { site, editing } = useSite();
  const reserve = reservationsVisible(site, editing);
  return (
    <section className="s-hero" id="s-top">
      <div className="s-hero__bg" style={{ '--img': cssUrl(site.hero.image) }} aria-hidden="true" />
      {editing && <ImageButton path={['hero', 'image']} options={{ max: 1920 }} label="Trocar foto de fundo" className="s-hero__photo" />}
      <div className="s-container s-hero__content">
        <Text path={['hero', 'eyebrow']} className="s-hero__eyebrow s-glass" placeholder="Frase curta de boas-vindas" />
        <h1 className="s-hero__title">
          <Text path={['hero', 'title1']} placeholder="Título" />
          <br />
          <em><Text path={['hero', 'title2']} placeholder="destaque." /></em>
        </h1>
        <Text as="p" path={['hero', 'lead']} className="s-hero__lead" multiline placeholder="Conte em poucas linhas o que torna sua casa especial." />
        <div className="s-hero__cta">
          <SButton size="lg" href="#s-menu" icon={<ArrowRightIcon size={18} />} className="s-hero__primary">
            <Text path={['hero', 'ctaMenu']} placeholder="Ver cardápio" />
          </SButton>
          {reserve && (
            <SButton size="lg" variant="glass" href="#s-reserve">
              <Text path={['hero', 'ctaReserve']} placeholder="Reservar mesa" />
            </SButton>
          )}
        </div>
      </div>
    </section>
  );
}

function Promotions() {
  const { site, t, tx, locale, formatPrice, editing, openPanel } = useSite();
  const [copied, setCopied] = useState(null);
  const promos = activePromotions(site);
  if (!promos.length) return null;

  const until = (iso) => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
  const copy = (code) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <section className="s-section s-promos" id="s-promos">
      <div className="s-container">
        <div className="s-section__head">
          <div>
            <span className="s-eyebrow">{t('promos.eyebrow')}</span>
            <h2 className="s-section__title">{t('promos.title')}</h2>
          </div>
        </div>
        <div className={`s-promo-grid ${editing ? 'ed-clickable' : ''}`} onClick={editing ? () => openPanel?.('promocoes') : undefined}>
          {promos.map((p) => {
            const items = p.type === 'items' ? site.menu.items.filter((i) => p.itemIds.includes(i.id)) : [];
            return (
              <article key={p.id} className="s-promo s-glass-lite">
                <span className="s-promo__badge">{promoBadge(p, formatPrice)}</span>
                <h3>{tx(p.title) || t('promos.eyebrow')}</h3>
                {tx(p.description) && <p className="s-muted">{tx(p.description)}</p>}
                <ul className="s-promo__meta">
                  <li><TagIcon size={14} /> {p.type === 'reservation' && p.minAdvanceHours ? t('promos.advance', { hours: p.minAdvanceHours }) : t(`promos.${p.type}`)}</li>
                  {items.length > 0 && <li>{items.slice(0, 3).map((i) => tx(i.name)).join(', ')}{items.length > 3 ? '…' : ''}</li>}
                  {p.end && <li><ClockIcon size={14} /> {t('promos.until', { date: until(p.end) })}</li>}
                </ul>
                {p.code ? (
                  <button type="button" className="s-promo__code" onClick={(e) => { e.stopPropagation(); if (!editing) copy(p.code); }}>
                    <span>{t('promos.coupon')}: <strong>{p.code}</strong></span>
                    <CopyIcon size={15} /> {copied === p.code ? t('promos.copied') : t('promos.copy')}
                  </button>
                ) : (
                  p.type !== 'reservation' && <span className="s-promo__auto">{t('promos.auto')}</span>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MenuSection({ onTable }) {
  const { site, t, tx, editing, update, lang } = useSite();
  const cart = useCart();
  const [active, setActive] = useState('all');
  const { categories, items } = site.menu;

  useEffect(() => {
    if (active !== 'all' && !categories.some((c) => c.id === active)) setActive('all');
  }, [categories, active]);

  if (!editing && !items.length) return null;

  const shown = items.map((item, index) => ({ item, index })).filter(({ item }) => active === 'all' || item.categoryId === active);
  const orderable = !editing && canOrder(site, cart);

  const addDish = () => {
    const categoryId = active !== 'all' ? active : categories[0]?.id;
    if (!categoryId) return;
    update(['menu', 'items'], [
      ...items,
      { id: newId(), categoryId, name: { [lang]: '' }, description: { [lang]: '' }, price: 0, image: null, featured: false, available: true },
    ]);
  };
  const addCategory = () => {
    const id = newId();
    update(['menu', 'categories'], [...categories, { id, name: { [lang]: 'Nova categoria' } }]);
    setActive(id);
  };

  return (
    <section className="s-section" id="s-menu">
      <div className="s-container">
        <SectionHead base="menuSection" />
        <div className="s-menu-toolbar s-glass">
          <div className="s-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={active === 'all'} className={`s-tab ${active === 'all' ? 'is-active' : ''}`} onClick={() => setActive('all')}>
              {t('menu.all')}
            </button>
            {categories.map((c, i) =>
              editing && active === c.id ? (
                <div key={c.id} role="tab" aria-selected="true" className="s-tab is-active">
                  <Text path={['menu', 'categories', i, 'name']} placeholder="Categoria" />
                </div>
              ) : (
                <button key={c.id} type="button" role="tab" aria-selected={active === c.id} className={`s-tab ${active === c.id ? 'is-active' : ''}`} onClick={() => setActive(c.id)}>
                  {tx(c.name) || '—'}
                </button>
              ),
            )}
            {editing && (
              <button type="button" className="s-tab s-tab--add" onClick={addCategory}>
                <PlusIcon size={16} /> Categoria
              </button>
            )}
          </div>
        </div>

        {shown.length > 0 || editing ? (
          <div className="s-menu-grid">
            {shown.map(({ item, index }) => <MenuCard key={item.id} item={item} index={index} orderable={orderable} />)}
            {editing && categories.length > 0 && (
              <button type="button" className="s-menu-add" onClick={addDish}>
                <PlusIcon size={22} />
                Adicionar prato
              </button>
            )}
          </div>
        ) : (
          <div className="s-state">{t('menu.empty')}</div>
        )}

        {site.tableService.enabled && (
          <div className="s-table-cta">
            <SButton variant="glass" size="lg" icon={<StoreIcon size={18} />} onClick={editing ? undefined : onTable}>
              {cart.table ? t('table.welcome', { table: cart.table.label }) : t('table.cta')}
            </SButton>
          </div>
        )}
      </div>
    </section>
  );
}

function MenuCard({ item, index, orderable }) {
  const { site, t, tx, editing, update, formatPrice } = useSite();
  const cart = useCart();
  const path = ['menu', 'items', index];
  const category = site.menu.categories.find((c) => c.id === item.categoryId);
  const deal = itemDeal(site, item);
  const remove = () => {
    const name = tx(item.name) || 'este prato';
    if (window.confirm(`Excluir "${name}" do cardápio?`)) update(['menu', 'items'], site.menu.items.filter((i) => i.id !== item.id));
  };

  return (
    <article className={`s-menu-card s-glass-lite ${item.available ? '' : 'is-sold-out'}`}>
      <ImageSlot path={[...path, 'image']} className="s-menu-card__media" options={{ max: 1000 }}>
        {item.image && <img src={item.image} alt="" loading="lazy" />}
        {category && <span className="s-menu-card__tag">{tx(category.name)}</span>}
        {deal && <span className="s-menu-card__deal">{promoBadge(deal.promo, formatPrice)}</span>}
        {item.featured && (
          <span className="s-menu-card__badge s-menu-card__badge--media">
            <FlameIcon size={12} />
            {t('menu.featured')}
          </span>
        )}
        {!item.available && <span className="s-menu-card__soldout">{t('menu.soldOut')}</span>}
      </ImageSlot>
      <div className="s-menu-card__body">
        <Text as="h3" path={[...path, 'name']} className="s-menu-card__title" placeholder="Nome do prato" />
        <Text as="p" path={[...path, 'description']} className="s-menu-card__desc" multiline placeholder="Descreva o prato" />
        <div className="s-menu-card__footer">
          {deal && !editing ? (
            <span className="s-menu-card__price">
              <s className="s-menu-card__old">{formatPrice(item.price)}</s> {formatPrice(deal.price)}
            </span>
          ) : (
            <Price path={[...path, 'price']} className="s-menu-card__price" />
          )}
          {item.featured && (
            <span className="s-menu-card__badge s-menu-card__badge--inline" title={t('menu.featured')}>
              <FlameIcon size={12} />
              <span className="s-menu-card__badge-text">{t('menu.featured')}</span>
            </span>
          )}
          {orderable && item.available && (
            <button type="button" className="s-menu-card__add" aria-label={t('menu.add', { name: tx(item.name) })} onClick={() => cart.add(item.id)}>
              <PlusIcon size={18} />
            </button>
          )}
        </div>
      </div>
      {editing && (
        <div className="ed-toolbar">
          <button type="button" className={item.featured ? 'is-on' : ''} title={item.featured ? 'Tirar dos favoritos' : 'Marcar como favorito da casa'} onClick={() => update([...path, 'featured'], !item.featured)}>
            <StarIcon size={16} />
          </button>
          <button type="button" className={item.available ? '' : 'is-on'} title={item.available ? 'Marcar como esgotado' : 'Marcar como disponível'} onClick={() => update([...path, 'available'], !item.available)}>
            {item.available ? <EyeIcon size={16} /> : <EyeOffIcon size={16} />}
          </button>
          <button type="button" className="is-danger" title="Excluir prato" onClick={remove}>
            <TrashIcon size={16} />
          </button>
        </div>
      )}
    </article>
  );
}

const EXPERIENCE_ICONS = [FlameIcon, KnifeIcon, GlassIcon];

function Experience() {
  const { site, editing, update, lang } = useSite();
  const { items } = site.experience;
  return (
    <section className="s-section s-experience" id="s-about">
      <div className="s-container s-experience__grid">
        <div className="s-experience__media">
          <ImageSlot path={['experience', 'image']} className="s-experience__photo" style={{ '--img': cssUrl(site.experience.image) }} options={{ max: 1200 }} />
          <div className="s-experience__stat s-glass">
            <Text as="strong" path={['experience', 'statValue']} placeholder="+10" />
            <Text path={['experience', 'statLabel']} placeholder="anos de história" />
          </div>
        </div>

        <div className="s-experience__copy">
          <SectionHead base="experience" />
          <ol className="s-experience__list">
            {items.map((item, i) => {
              const Icon = EXPERIENCE_ICONS[i % EXPERIENCE_ICONS.length];
              return (
                <li key={item.id} className="s-experience__item">
                  <span className="s-experience__index">{String(i + 1).padStart(2, '0')}</span>
                  <div className="s-experience__text">
                    <h3>
                      <Icon size={18} />
                      <Text path={['experience', 'items', i, 'title']} placeholder="Destaque" />
                    </h3>
                    <Text as="p" path={['experience', 'items', i, 'text']} multiline placeholder="Conte mais sobre este destaque" />
                  </div>
                  {editing && (
                    <button type="button" className="ed-remove" title="Remover destaque" onClick={() => update(['experience', 'items'], items.filter((x) => x.id !== item.id))}>
                      <CloseIcon size={14} />
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
          {editing && items.length < 6 && (
            <button type="button" className="ed-add" onClick={() => update(['experience', 'items'], [...items, { id: newId(), title: { [lang]: '' }, text: { [lang]: '' } }])}>
              <PlusIcon size={16} /> Adicionar destaque
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

const WEEK = [1, 2, 3, 4, 5, 6, 0];

function Visit() {
  const { site, t, locale, editing, openPanel } = useSite();
  const cart = useCart();
  const today = weekdayOf(nowInTimezone().date);
  const dayName = (d) => new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 7 + d)));
  const time = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, 0, 1, h, m)));
  };
  const c = site.contact;
  const rows = [
    { key: 'phone', Icon: PhoneIcon, label: t('visit.phone'), value: c.phone, href: `tel:${String(c.phone).replace(/[^\d+]/g, '')}`, placeholder: '(11) 0000-0000' },
    { key: 'whatsapp', Icon: WhatsAppIcon, label: t('visit.whatsapp'), value: c.whatsapp, href: `https://wa.me/${waNumber(c.whatsapp)}`, placeholder: '(11) 90000-0000' },
    { key: 'email', Icon: MailIcon, label: t('visit.email'), value: c.email, href: `mailto:${c.email}`, placeholder: 'contato@restaurante.com' },
    { key: 'instagram', Icon: InstagramIcon, label: t('visit.instagram'), value: c.instagram && `@${handle(c.instagram)}`, href: `https://instagram.com/${handle(c.instagram)}`, placeholder: 'seurestaurante' },
  ];

  return (
    <section className="s-section" id="s-visit">
      <div className="s-container">
        <div className="s-visit s-glass">
          <div className="s-visit__hours">
            <SectionHead base="visitSection" />
            <h3 className="s-visit__subtitle"><ClockIcon size={18} /> {t('visit.hours')}</h3>
            <ul
              className={`s-hours ${editing ? 'ed-clickable' : ''}`}
              onClick={editing ? () => openPanel?.('horarios') : undefined}
              title={editing ? 'Clique para editar os horários' : undefined}
            >
              {WEEK.map((d) => {
                const h = site.hours[d];
                return (
                  <li key={d} className={d === today ? 'is-today' : ''}>
                    <span>{dayName(d)}</span>
                    <span>{h.open ? `${time(h.from)} – ${time(h.to)}` : t('visit.closed')}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="s-visit__contact">
            <h3 className="s-visit__subtitle">{t('visit.contact')}</h3>
            <ul className="s-contact">
              {rows
                .filter((r) => editing || r.value)
                .map(({ key, Icon, label, value, href, placeholder }) => (
                  <li key={key}>
                    <span className="s-contact__icon"><Icon size={18} /></span>
                    <span>
                      <small>{label}</small>
                      {editing ? (
                        <Text plain path={['contact', key]} placeholder={placeholder} />
                      ) : (
                        <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">{value}</a>
                      )}
                    </span>
                  </li>
                ))}
            </ul>
            {site.delivery.enabled && (
              <SButton icon={<TruckIcon size={18} />} onClick={editing ? undefined : () => { cart.leaveTable?.(); cart.open(); }}>
                {t('visit.delivery')}
              </SButton>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Locations() {
  const { site, t, editing, update } = useSite();
  const list = site.locations;
  const visible = list.filter((l) => l.name || l.address);
  if (!editing && !visible.length) return null;

  const add = () => update(['locations'], [...list, { id: newId(), name: '', address: '', city: '', state: '', phone: '', mapsUrl: '' }]);
  const remove = (id) => update(['locations'], list.filter((l) => l.id !== id));

  return (
    <section className="s-section" id="s-locations">
      <div className="s-container">
        <SectionHead base="locationsSection" />
        <div className="s-locations">
          {list.map((loc, i) => {
            if (!editing && !(loc.name || loc.address)) return null;
            const p = ['locations', i];
            const maps = loc.mapsUrl || (loc.address
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([loc.address, loc.city, loc.state].filter(Boolean).join(', '))}`
              : null);
            return (
              <article key={loc.id} className="s-location s-glass-lite">
                <span className="s-location__city">
                  {editing ? (
                    <>
                      <Text plain path={[...p, 'city']} placeholder="Cidade" /> · <Text plain path={[...p, 'state']} placeholder="UF" />
                    </>
                  ) : (
                    [loc.city, loc.state].filter(Boolean).join(' · ')
                  )}
                </span>
                <Text as="h3" plain path={[...p, 'name']} placeholder="Nome da unidade" />
                <p className="s-location__line"><MapPinIcon size={16} /> <Text plain path={[...p, 'address']} placeholder="Rua, número — bairro" /></p>
                {(editing || loc.phone) && (
                  <p className="s-location__line s-muted"><PhoneIcon size={16} /> <Text plain path={[...p, 'phone']} placeholder="Telefone da unidade" /></p>
                )}
                {maps && !editing && (
                  <a className="s-location__link" href={maps} target="_blank" rel="noopener noreferrer">
                    {t('locations.directions')} <ArrowRightIcon size={16} />
                  </a>
                )}
                {editing && list.length > 1 && (
                  <button type="button" className="ed-remove" title="Remover unidade" onClick={() => remove(loc.id)}>
                    <CloseIcon size={14} />
                  </button>
                )}
              </article>
            );
          })}
          {editing && (
            <button type="button" className="s-location-add" onClick={add}>
              <PlusIcon size={20} /> Adicionar unidade
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function Reserve() {
  const { site, editing, openPanel } = useSite();
  if (!site.reservations?.enabled) return null;
  const hasTables = allTables(site).length > 0;
  if (!hasTables && !editing) return null;

  return (
    <section className="s-section" id="s-reserve">
      <div className="s-container">
        <SectionHead base="reserveSection" />
        {hasTables ? (
          <Booking />
        ) : (
          <div className="s-state s-state--action">
            <LayoutIcon size={28} />
            <strong>Desenhe a planta do salão para liberar as reservas</strong>
            <span>Seus clientes escolhem a mesa direto no mapa. Essa etapa é obrigatória para publicar.</span>
            <button type="button" className="ed-cta" onClick={() => openPanel?.('planta')}>Desenhar planta</button>
          </div>
        )}
      </div>
    </section>
  );
}

/** Faixa fixa enquanto o cliente está numa mesa. */
function TableBanner({ onOpen }) {
  const { t } = useSite();
  const cart = useCart();
  if (!cart.table) return null;
  return (
    <div className="s-table-banner s-glass">
      <StoreIcon size={18} />
      <span>{t('table.banner', { table: cart.table.label })}</span>
      <button type="button" className="s-link" onClick={onOpen}>{t('table.callAgain')}</button>
      <button type="button" className="s-link" onClick={cart.leaveTable}>{t('table.leave')}</button>
    </div>
  );
}

function CartToast() {
  const { site, t, tx } = useSite();
  const cart = useCart();
  if (!cart.toast) return null;
  const item = site.menu.items.find((i) => i.id === cart.toast.itemId);
  return (
    <button type="button" key={cart.toast.at} className="s-toast s-glass" onClick={cart.open}>
      <BagIcon size={18} /> {t('menu.added', { name: tx(item?.name) })} · <strong>{t('nav.cart')} ({cart.count})</strong>
    </button>
  );
}

function SiteFooter({ page }) {
  const { site, t, editing } = useSite();
  const go = useGo(page);
  const c = site.contact;
  const year = new Date().getFullYear();
  const links = [['#s-menu', 'nav.menu'], ['#s-about', 'nav.about'], ['#s-visit', 'visit.hours']];
  if (reservationsVisible(site, editing)) links.push(['#s-reserve', 'nav.reserve']);

  return (
    <footer className="s-footer">
      <div className="s-container">
        <div className="s-footer__card s-glass-lite">
          <div className="s-footer__grid">
            <div className="s-footer__brand">
              <BrandLogo onHome={() => go('#s-top')} />
              <Text as="p" path={['footer', 'tagline']} multiline placeholder="Uma frase sobre o seu restaurante" />
            </div>
            <nav className="s-footer__col">
              <h3>{t('footer.navigate')}</h3>
              <ul>
                {links.map(([hash, key]) => (
                  <li key={hash}>
                    <a href={hash} onClick={(e) => { e.preventDefault(); go(hash); }}>{t(key)}</a>
                  </li>
                ))}
              </ul>
            </nav>
            {(c.phone || c.whatsapp || c.email || c.instagram) && (
              <div className="s-footer__col">
                <h3>{t('visit.contact')}</h3>
                <ul>
                  {c.phone && <li><a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>{c.phone}</a></li>}
                  {c.whatsapp && <li><a href={`https://wa.me/${waNumber(c.whatsapp)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>}
                  {c.email && <li><a href={`mailto:${c.email}`}>{c.email}</a></li>}
                  {c.instagram && <li><a href={`https://instagram.com/${handle(c.instagram)}`} target="_blank" rel="noopener noreferrer">@{handle(c.instagram)}</a></li>}
                </ul>
              </div>
            )}
          </div>
          <div className="s-footer__bottom">
            <p>{t('footer.rights', { year, name: site.brand.name })}</p>
            <p>
              {t('footer.madeWith')}{' '}
              {LUMENU_URL ? <a className="s-footer__author" href={LUMENU_URL} target="_blank" rel="noopener">Lumenu</a> : <strong className="s-footer__author">Lumenu</strong>}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
