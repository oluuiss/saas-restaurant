// Documento do site de um restaurante: conteúdo inicial, validação, checklist e horários de reserva.
// Usado pelo painel (navegador) e pela API (servidor).

import { AREA_TYPES, FLOOR_DEFAULT, FLOOR_LIMITS, MAX_SEATS, TABLE_SHAPES, allTables } from './floor.js';
import { LANGUAGE_CODES, isTranslatable } from './i18n.js';
import { SAMPLE_CATEGORIES, SAMPLE_ITEMS } from './menu-seed.js';

export const TIMEZONE = 'America/Sao_Paulo';
export const DEFAULT_ACCENT = '#ff7a3d';

/** Cores do site. glow = brilho colorido do fundo (vazio = sem brilho). */
export const DEFAULT_THEME = {
  accent: DEFAULT_ACCENT,
  background: '#0f0b09',
  glow: DEFAULT_ACCENT,
  gold: '#ffc861',
  price: '#ffc861',
  tableSelected: DEFAULT_ACCENT,
};

export const TEXT_STYLE_MODES = ['solid', 'gradient', 'animated'];

const IMG = (id, w) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

export const newId = () => Math.random().toString(36).slice(2, 10);

export function createDefaultSite(name) {
  return {
    version: 1,
    languages: ['pt'],
    defaultLanguage: 'pt',
    theme: { ...DEFAULT_THEME },
    textStyles: {},
    brand: { name, logo: null, favicon: null, showName: true },
    hero: {
      image: IMG('photo-1544025162-d76694265947', 1920),
      eyebrow: { pt: `Bem-vindo ao ${name}`, en: `Welcome to ${name}`, de: `Willkommen im ${name}` },
      title1: { pt: 'Comida boa,', en: 'Good food,', de: 'Gutes Essen,' },
      title2: { pt: 'mesa cheia.', en: 'a full table.', de: 'ein voller Tisch.' },
      lead: {
        pt: 'Pratos feitos com carinho, ingredientes selecionados e um ambiente para reunir quem você gosta. Venha nos visitar ou peça para levar para casa.',
        en: 'Dishes made with care, hand-picked ingredients and a place to gather the people you love. Visit us or order in.',
        de: 'Mit Liebe zubereitete Gerichte, ausgewählte Zutaten und ein Ort für Ihre Liebsten. Besuchen Sie uns oder bestellen Sie nach Hause.',
      },
      ctaMenu: { pt: 'Ver cardápio', en: 'See the menu', de: 'Zur Speisekarte' },
      ctaReserve: { pt: 'Reservar mesa', en: 'Book a table', de: 'Tisch reservieren' },
    },
    menuSection: {
      eyebrow: { pt: 'Cardápio', en: 'Menu', de: 'Speisekarte' },
      title: { pt: 'Os pratos que fazem a fama', en: 'The dishes we are famous for', de: 'Die Gerichte, für die man uns kennt' },
      lead: {
        pt: 'Escolhidos por quem volta sempre. Perfeitos para dividir — ou não.',
        en: 'Picked by the guests who keep coming back. Perfect for sharing — or not.',
        de: 'Ausgewählt von Gästen, die immer wiederkommen. Perfekt zum Teilen – oder auch nicht.',
      },
    },
    experience: {
      image: IMG('photo-1555396273-367ea4eb4db5', 900),
      eyebrow: { pt: 'A experiência', en: 'The experience', de: 'Das Erlebnis' },
      title: { pt: 'Mais que um jantar, um encontro', en: 'More than dinner — a get-together', de: 'Mehr als ein Abendessen – ein Treffen' },
      lead: {
        pt: 'Do primeiro petisco à sobremesa, tudo foi pensado para você sair com vontade de voltar.',
        en: 'From the first bite to dessert, everything is designed to make you want to come back.',
        de: 'Vom ersten Bissen bis zum Dessert ist alles darauf ausgelegt, dass Sie wiederkommen möchten.',
      },
      statValue: { pt: '+10', en: '10+', de: '10+' },
      statLabel: { pt: 'anos servindo a nossa cidade', en: 'years serving our city', de: 'Jahre in unserer Stadt' },
      items: [
        {
          id: newId(),
          title: { pt: 'Ingredientes frescos', en: 'Fresh ingredients', de: 'Frische Zutaten' },
          text: { pt: 'Fornecedores que conhecemos pelo nome e produtos escolhidos todos os dias.', en: 'Suppliers we know by name and produce picked every day.', de: 'Lieferanten, die wir persönlich kennen, und täglich ausgewählte Produkte.' },
        },
        {
          id: newId(),
          title: { pt: 'Feito na hora', en: 'Made to order', de: 'Frisch zubereitet' },
          text: { pt: 'Cada prato sai da cozinha no ponto certo, do jeito que você pediu.', en: 'Every dish leaves the kitchen just right, the way you ordered it.', de: 'Jedes Gericht verlässt die Küche genau so, wie Sie es bestellt haben.' },
        },
        {
          id: newId(),
          title: { pt: 'Feito para reunir', en: 'Made for gathering', de: 'Gemacht fürs Beisammensein' },
          text: { pt: 'Mesas grandes, pratos para dividir e um ambiente para ficar mais uma rodada.', en: 'Big tables, sharing plates and a room that invites one more round.', de: 'Große Tische, Gerichte zum Teilen und ein Ort für noch eine Runde.' },
        },
      ],
    },
    visitSection: {
      eyebrow: { pt: 'Visite a gente', en: 'Visit us', de: 'Besuchen Sie uns' },
      title: { pt: 'Horários e contato', en: 'Hours & contact', de: 'Öffnungszeiten & Kontakt' },
    },
    locationsSection: {
      eyebrow: { pt: 'Perto de você', en: 'Near you', de: 'In Ihrer Nähe' },
      title: { pt: 'Nossas unidades', en: 'Our locations', de: 'Unsere Standorte' },
      lead: {
        pt: 'Encontre a unidade mais próxima, confira o endereço e trace sua rota.',
        en: 'Find the closest location, check the address and get directions.',
        de: 'Finden Sie den nächsten Standort, prüfen Sie die Adresse und planen Sie Ihre Route.',
      },
    },
    reserveSection: {
      eyebrow: { pt: 'Reservas', en: 'Reservations', de: 'Reservierungen' },
      title: { pt: 'Escolha sua mesa', en: 'Pick your table', de: 'Wählen Sie Ihren Tisch' },
      lead: {
        pt: 'Escolha a data, o horário e a mesa direto no mapa do salão.',
        en: 'Choose the date, time and your table right on our floor plan.',
        de: 'Wählen Sie Datum, Uhrzeit und Ihren Tisch direkt im Raumplan.',
      },
    },
    footer: {
      tagline: {
        pt: 'Comida boa, porções generosas e aquele clima de encontro entre amigos desde a primeira mordida.',
        en: 'Good food, generous portions and that get-together feeling from the very first bite.',
        de: 'Gutes Essen, großzügige Portionen und dieses Gefühl von Freundeskreis ab dem ersten Bissen.',
      },
    },
    contact: { phone: '', whatsapp: '', email: '', instagram: '' },
    hours: Array.from({ length: 7 }, () => ({ open: true, from: '12:00', to: '23:00' })),
    locations: [{ id: newId(), name, address: '', city: '', state: '', phone: '', mapsUrl: '' }],
    menu: { categories: structuredClone(SAMPLE_CATEGORIES), items: structuredClone(SAMPLE_ITEMS) },
    floors: [
      {
        id: newId(),
        name: { pt: 'Salão principal', en: 'Main dining room', de: 'Hauptraum' },
        width: FLOOR_DEFAULT.width,
        height: FLOOR_DEFAULT.height,
        tableScale: 1,
        elements: [{ id: newId(), type: 'entrance', x: 10.5, y: FLOOR_DEFAULT.height - 0.5, w: 3, h: 0.5 }],
      },
    ],
    reservations: { enabled: true, slotMinutes: 30, durationMinutes: 120, daysAhead: 30 },
    delivery: { enabled: true, fee: 790, minOrder: 3000, freeAbove: 15000, estimateMin: 40, estimateMax: 60, payOnDelivery: true, payOnline: true },
    tableService: { enabled: true, orders: true, call: true },
    promotions: [],
  };
}

/* ---------- Validação (servidor) ---------- */

export class SiteValidationError extends Error {}

const MAX_DOC_BYTES = 600_000;
const ID_RE = /^[a-zA-Z0-9_-]{1,40}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MEDIA_RE = /^\/api\/media\/[0-9a-f-]{36}$/;

const str = (v, max = 300) => (typeof v === 'string' ? v.slice(0, max) : '');
const bool = (v, d = false) => (typeof v === 'boolean' ? v : d);
const num = (v, min, max, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};
const half = (v, min, max, d) => Math.round(num(v, min, max, d) * 2) / 2;
const id = (v) => (typeof v === 'string' && ID_RE.test(v) ? v : Math.random().toString(36).slice(2, 10));
const list = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);

function text(v, max = 300) {
  if (typeof v === 'string') return { pt: v.slice(0, max) };
  const out = {};
  if (v && typeof v === 'object') for (const code of LANGUAGE_CODES) if (typeof v[code] === 'string') out[code] = v[code].slice(0, max);
  return out;
}

export function safeImageUrl(v) {
  if (typeof v !== 'string' || v.length > 600) return null;
  if (MEDIA_RE.test(v)) return v;
  try {
    const url = new URL(v);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function safeHttpUrl(v) {
  if (typeof v !== 'string' || !v.trim()) return '';
  try {
    const url = new URL(v.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString().slice(0, 600) : '';
  } catch {
    return '';
  }
}

const isHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const color = (v, d = DEFAULT_ACCENT) => (isHex(v) ? v.toLowerCase() : d);
const DATE_RE = /^d{4}-d{2}-d{2}$/;
const cents = (v, max = 100_000_00, fallback = 0) => Math.round(num(v, 0, max, fallback));

function textStyles(input) {
  const out = {};
  if (!input || typeof input !== 'object') return out;
  for (const [key, st] of Object.entries(input).slice(0, 500)) {
    if (!/^[w.-]{1,120}$/.test(key) || !st || typeof st !== 'object') continue;
    const style = {};
    if (TEXT_STYLE_MODES.includes(st.mode)) style.mode = st.mode;
    if (isHex(st.color)) style.color = st.color.toLowerCase();
    if (isHex(st.color2)) style.color2 = st.color2.toLowerCase();
    const size = Math.round(num(st.size, 40, 300, 100));
    if (size !== 100) style.size = size;
    if (Object.keys(style).length) out[key] = style;
  }
  return out;
}

function promotion(p) {
  const type = ['all', 'items', 'reservation'].includes(p?.type) ? p.type : 'all';
  const discountType = p?.discountType === 'fixed' ? 'fixed' : 'percent';
  return {
    id: id(p?.id),
    active: bool(p?.active, true),
    title: text(p?.title, 80),
    description: text(p?.description, 300),
    type,
    itemIds: list(p?.itemIds, 100).filter((x) => typeof x === 'string' && ID_RE.test(x)),
    discountType,
    value: discountType === 'percent' ? Math.round(num(p?.value, 1, 100, 10)) : cents(p?.value),
    code: str(p?.code, 24).toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
    start: DATE_RE.test(p?.start) ? p.start : '',
    end: DATE_RE.test(p?.end) ? p.end : '',
    weekdays: list(p?.weekdays, 7).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
    minAdvanceHours: Math.round(num(p?.minAdvanceHours, 0, 720, 0)),
  };
}
const time = (v, d) => (typeof v === 'string' && TIME_RE.test(v) ? v : d);

function element(el) {
  if (el?.type === 'table') {
    const shape = TABLE_SHAPES[el.shape] ? el.shape : 'square';
    return {
      id: id(el.id), type: 'table', label: str(el.label, 8) || 'M', shape,
      seats: Math.round(num(el.seats, 1, MAX_SEATS, 4)),
      x: half(el.x, 0, FLOOR_LIMITS.max, 0), y: half(el.y, 0, FLOOR_LIMITS.max, 0),
      w: half(el.w, 0.5, 30, 2), h: half(el.h, 0.5, 30, 2),
    };
  }
  if (!AREA_TYPES[el?.type]) return null;
  const min = ['wall', 'window', 'entrance'].includes(el.type) ? 0.2 : 0.5;
  const round = (v, d) => Math.round(num(v, min, FLOOR_LIMITS.max, d) * 10) / 10;
  return {
    id: id(el.id), type: el.type, label: str(el.label, 30),
    x: half(el.x, 0, FLOOR_LIMITS.max, 0), y: half(el.y, 0, FLOOR_LIMITS.max, 0),
    w: round(el.w, AREA_TYPES[el.type].w), h: round(el.h, AREA_TYPES[el.type].h),
  };
}

/** Normaliza o documento enviado pelo painel. Campos desconhecidos são descartados. */
export function sanitizeSite(input) {
  if (!input || typeof input !== 'object') throw new SiteValidationError('Documento inválido.');
  if (JSON.stringify(input).length > MAX_DOC_BYTES) throw new SiteValidationError('O site ficou grande demais para salvar.');

  const languages = list(input.languages, 3).filter((c, i, a) => LANGUAGE_CODES.includes(c) && a.indexOf(c) === i);
  if (!languages.length) languages.push('pt');
  const defaultLanguage = languages.includes(input.defaultLanguage) ? input.defaultLanguage : languages[0];

  const s = (o, keys, max) => Object.fromEntries(keys.map((k) => [k, text(o?.[k], max)]));
  const categories = list(input.menu?.categories, 30).map((c) => ({ id: id(c.id), name: text(c.name, 60) }));
  const categoryIds = new Set(categories.map((c) => c.id));

  return {
    version: 1,
    languages,
    defaultLanguage,
    theme: {
      accent: color(input.theme?.accent),
      background: color(input.theme?.background, DEFAULT_THEME.background),
      glow: input.theme?.glow === '' ? '' : color(input.theme?.glow, DEFAULT_THEME.glow),
      gold: color(input.theme?.gold, DEFAULT_THEME.gold),
      price: color(input.theme?.price, DEFAULT_THEME.price),
      tableSelected: color(input.theme?.tableSelected, DEFAULT_THEME.tableSelected),
    },
    textStyles: textStyles(input.textStyles),
    brand: {
      name: str(input.brand?.name, 60).trim() || 'Meu restaurante',
      logo: safeImageUrl(input.brand?.logo),
      favicon: safeImageUrl(input.brand?.favicon),
      showName: bool(input.brand?.showName, true),
    },
    hero: { image: safeImageUrl(input.hero?.image), ...s(input.hero, ['eyebrow', 'title1', 'title2', 'lead', 'ctaMenu', 'ctaReserve'], 400) },
    menuSection: s(input.menuSection, ['eyebrow', 'title', 'lead'], 400),
    experience: {
      image: safeImageUrl(input.experience?.image),
      ...s(input.experience, ['eyebrow', 'title', 'lead', 'statValue', 'statLabel'], 400),
      items: list(input.experience?.items, 6).map((it) => ({ id: id(it.id), title: text(it.title, 80), text: text(it.text, 400) })),
    },
    visitSection: s(input.visitSection, ['eyebrow', 'title'], 120),
    locationsSection: s(input.locationsSection, ['eyebrow', 'title', 'lead'], 400),
    reserveSection: s(input.reserveSection, ['eyebrow', 'title', 'lead'], 400),
    footer: { tagline: text(input.footer?.tagline, 400) },
    contact: {
      phone: str(input.contact?.phone, 30),
      whatsapp: str(input.contact?.whatsapp, 30),
      email: str(input.contact?.email, 120),
      instagram: str(input.contact?.instagram, 60).replace(/[^\w.@]/g, ''),
    },
    hours: Array.from({ length: 7 }, (_, i) => {
      const h = input.hours?.[i];
      return { open: bool(h?.open, true), from: time(h?.from, '12:00'), to: time(h?.to, '23:00') };
    }),
    locations: list(input.locations, 20).map((l) => ({
      id: id(l.id), name: str(l.name, 80), address: str(l.address, 160), city: str(l.city, 60),
      state: str(l.state, 30), phone: str(l.phone, 30), mapsUrl: safeHttpUrl(l.mapsUrl),
    })),
    menu: {
      categories,
      items: list(input.menu?.items, 300)
        .filter((it) => categoryIds.has(it.categoryId))
        .map((it) => ({
          id: id(it.id), categoryId: it.categoryId, name: text(it.name, 80), description: text(it.description, 400),
          price: Math.round(num(it.price, 0, 10_000_000, 0)), image: safeImageUrl(it.image),
          featured: bool(it.featured), available: bool(it.available, true),
        })),
    },
    floors: list(input.floors, 10).map((f) => ({
      id: id(f.id), name: text(f.name, 40),
      width: Math.round(num(f.width, FLOOR_LIMITS.min, FLOOR_LIMITS.max, FLOOR_DEFAULT.width)),
      height: Math.round(num(f.height, FLOOR_LIMITS.min, FLOOR_LIMITS.max, FLOOR_DEFAULT.height)),
      tableScale: Math.round(num(f.tableScale, 0.4, 2, 1) * 100) / 100,
      elements: list(f.elements, 300).map(element).filter(Boolean),
    })),
    reservations: {
      enabled: bool(input.reservations?.enabled, true),
      slotMinutes: [15, 30, 60].includes(input.reservations?.slotMinutes) ? input.reservations.slotMinutes : 30,
      durationMinutes: Math.round(num(input.reservations?.durationMinutes, 30, 360, 120) / 15) * 15,
      daysAhead: Math.round(num(input.reservations?.daysAhead, 1, 180, 30)),
    },
    delivery: {
      enabled: bool(input.delivery?.enabled, true),
      fee: cents(input.delivery?.fee, 100_000, 790),
      minOrder: cents(input.delivery?.minOrder, 1_000_000, 3000),
      freeAbove: cents(input.delivery?.freeAbove, 1_000_000, 15000),
      estimateMin: Math.round(num(input.delivery?.estimateMin, 5, 240, 40)),
      estimateMax: Math.round(num(input.delivery?.estimateMax, 5, 300, 60)),
      payOnDelivery: bool(input.delivery?.payOnDelivery, true),
      payOnline: bool(input.delivery?.payOnline, true),
    },
    tableService: {
      enabled: bool(input.tableService?.enabled, true),
      orders: bool(input.tableService?.orders, true),
      call: bool(input.tableService?.call, true),
    },
    promotions: list(input.promotions, 50).map(promotion),
  };
}

/* ---------- Checklist de publicação ---------- */

export function publishChecklist(site) {
  return [
    { id: 'name', label: 'Nome do restaurante', ok: Boolean(site.brand?.name?.trim()), required: true, panel: 'restaurante' },
    { id: 'floor', label: 'Planta do salão com pelo menos uma mesa', ok: allTables(site).length > 0, required: true, panel: 'planta' },
    { id: 'contact', label: 'Telefone ou WhatsApp', ok: Boolean(site.contact?.phone || site.contact?.whatsapp), required: false, panel: 'contato' },
    { id: 'location', label: 'Endereço de uma unidade', ok: site.locations?.some((l) => l.address?.trim()) ?? false, required: false, panel: 'localizacoes' },
    { id: 'menu', label: 'Pelo menos um prato no cardápio', ok: (site.menu?.items?.length ?? 0) > 0, required: false, panel: 'cardapio' },
  ];
}

export const canPublish = (site) => publishChecklist(site).every((c) => c.ok || !c.required);

/** Quantos textos estão preenchidos em algum idioma mas faltam em `lang`. */
export function missingTranslations(site, lang) {
  let missing = 0;
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    if (isTranslatable(node)) {
      if (!node[lang]?.trim() && LANGUAGE_CODES.some((c) => node[c]?.trim())) missing += 1;
      return;
    }
    Object.values(node).forEach(walk);
  };
  walk({ ...site, contact: null, locations: null });
  return missing;
}

/* ---------- Horários de reserva ---------- */

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const toHHMM = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** Dia da semana (0 = domingo) de uma data "AAAA-MM-DD", sem depender do fuso. */
export const weekdayOf = (iso) => new Date(`${iso}T12:00:00Z`).getUTCDay();

export function addDaysIso(iso, days) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Data e minuto atuais no fuso do restaurante. */
export function nowInTimezone(timeZone = TIMEZONE) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

/** Horários reserváveis em uma data. Horários que já passaram (hoje) ficam de fora. */
export function reservationSlots(site, dateIso) {
  const day = site.hours?.[weekdayOf(dateIso)];
  if (!day?.open) return [];
  const { slotMinutes = 30, durationMinutes = 120 } = site.reservations ?? {};
  const from = toMinutes(day.from);
  let to = toMinutes(day.to);
  if (to <= from) to = 24 * 60;
  const last = Math.max(from, to - durationMinutes);
  const now = nowInTimezone();
  const slots = [];
  for (let t = from; t <= last && t < 24 * 60; t += slotMinutes) {
    if (dateIso === now.date && t <= now.minutes) continue;
    slots.push(toHHMM(t));
  }
  return slots;
}

export function reservationWindow(site) {
  const today = nowInTimezone().date;
  return { first: today, last: addDaysIso(today, site.reservations?.daysAhead ?? 30) };
}

export const timeToMinutes = toMinutes;

/** Pratos esgotados agora (marcados na operação, sem precisar publicar) ficam indisponíveis. */
export function withSoldOut(site, soldOut) {
  const ids = new Set(Array.isArray(soldOut) ? soldOut : []);
  if (!ids.size) return site;
  return { ...site, menu: { ...site.menu, items: site.menu.items.map((i) => (ids.has(i.id) ? { ...i, available: false } : i)) } };
}
