// Promoções e cálculo de pedidos. O carrinho usa para mostrar os valores e o servidor recalcula
// tudo com os mesmos dados publicados (o navegador nunca define preço).

import { nowInTimezone, weekdayOf } from './site.js';

export const PROMO_TYPES = {
  all: 'Todo o cardápio',
  items: 'Pratos específicos',
  reservation: 'Reserva antecipada',
};

export function promoIsActive(promo, today) {
  if (!promo?.active) return false;
  if (promo.start && today < promo.start) return false;
  if (promo.end && today > promo.end) return false;
  if (promo.weekdays?.length && !promo.weekdays.includes(weekdayOf(today))) return false;
  return true;
}

export const activePromotions = (site, today = nowInTimezone().date) => (site.promotions ?? []).filter((p) => promoIsActive(p, today));

/** Preço de uma unidade com o desconto aplicado. */
export const discounted = (cents, promo) =>
  promo.discountType === 'percent' ? Math.round(cents * (1 - promo.value / 100)) : Math.max(0, cents - promo.value);

/** "-20%" ou "-R$ 10,00" */
export const promoBadge = (promo, formatPrice) => (promo.discountType === 'percent' ? `-${promo.value}%` : `-${formatPrice(promo.value)}`);

/** Promoção automática (sem cupom) mais vantajosa para um prato. */
export function itemDeal(site, item, today = nowInTimezone().date) {
  let best = null;
  for (const promo of activePromotions(site, today)) {
    if (promo.type !== 'items' || promo.code || !promo.itemIds?.includes(item.id)) continue;
    const price = discounted(item.price, promo);
    if (!best || price < best.price) best = { promo, price };
  }
  return best;
}

const sameCode = (a, b) => Boolean(a) && Boolean(b) && String(a).trim().toUpperCase() === String(b).trim().toUpperCase();

/**
 * Calcula um pedido. `lines` = [{ itemId, qty }], `mode` = delivery | table.
 * Desconto no pedido: o maior entre cupom digitado e promoções gerais automáticas (não acumulam).
 */
export function quoteOrder(site, { lines, mode, code, today = nowInTimezone().date }) {
  const errors = [];
  const byId = new Map(site.menu.items.map((i) => [i.id, i]));
  const out = [];

  for (const line of lines ?? []) {
    const item = byId.get(line.itemId);
    if (!item) continue;
    if (!item.available) {
      errors.push('unavailable');
      continue;
    }
    const qty = Math.max(1, Math.min(50, Math.round(Number(line.qty) || 1)));
    const deal = itemDeal(site, item, today);
    const unit = deal ? deal.price : item.price;
    out.push({ itemId: item.id, name: item.name, qty, unit, original: item.price, total: unit * qty });
  }

  const subtotal = out.reduce((sum, l) => sum + l.total, 0);
  const promos = activePromotions(site, today).filter((p) => p.type !== 'reservation');
  const couponPromo = code ? promos.find((p) => p.code && sameCode(p.code, code)) ?? null : null;

  let discount = 0;
  let promo = null;
  for (const p of promos) {
    if (p.code ? p !== couponPromo : p.type !== 'all') continue;
    const lines_ = p.type === 'all' ? out : out.filter((l) => p.itemIds?.includes(l.itemId));
    const base = lines_.reduce((sum, l) => sum + l.total, 0);
    if (!base) continue;
    const units = lines_.reduce((sum, l) => sum + l.qty, 0);
    const value = p.discountType === 'percent' ? Math.round((base * p.value) / 100) : Math.min(base, p.type === 'all' ? p.value : p.value * units);
    if (value > discount) {
      discount = value;
      promo = p;
    }
  }

  const delivery = site.delivery ?? {};
  let deliveryFee = 0;
  if (mode === 'delivery') {
    deliveryFee = delivery.freeAbove && subtotal - discount >= delivery.freeAbove ? 0 : delivery.fee ?? 0;
    if (delivery.minOrder && subtotal < delivery.minOrder) errors.push('minOrder');
  }

  return {
    lines: out,
    subtotal,
    discount,
    deliveryFee,
    total: Math.max(0, subtotal - discount) + deliveryFee,
    promo,
    coupon: code ? { code: String(code).trim().toUpperCase(), valid: Boolean(couponPromo), applied: Boolean(couponPromo) && promo === couponPromo } : null,
    errors,
  };
}

/** Promoção de reserva antecipada que vale para uma reserva feita agora para `date` `time`. */
export function reservationDeal(site, { date, time }, now = Date.now()) {
  const hoursAhead = (Date.parse(`${date}T${time}:00-03:00`) - now) / 3_600_000;
  return (
    activePromotions(site, nowInTimezone().date)
      .filter((p) => p.type === 'reservation' && hoursAhead >= (p.minAdvanceHours ?? 0))
      .sort((a, b) => b.value - a.value)[0] ?? null
  );
}
