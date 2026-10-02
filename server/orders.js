import crypto from 'node:crypto';
import { tr } from '../shared/i18n.js';

/**
 * Grava um pedido com o próximo número do restaurante. Pedido de mesa entra na comanda aberta
 * da mesa; se a mesa ainda estava livre, ela passa a ficar ocupada (com 0 pessoas até alguém informar).
 */
export async function insertOrder(sql, restaurantId, site, o) {
  const items = o.quote.lines.map((l) => ({ itemId: l.itemId, name: l.name, qty: l.qty, unit: l.unit, total: l.total }));
  const quote = o.quote;
  const orderId = crypto.randomUUID();
  const table = o.table ?? null;

  const statements = [sql`select pg_advisory_xact_lock(hashtext(${`${restaurantId}:orders`}))`];
  if (table) {
    statements.push(sql`
      insert into table_sessions (restaurant_id, table_id, table_label, opened_by)
      values (${restaurantId}, ${table.id}, ${table.label}, ${o.createdBy ?? 'Cliente pelo celular'})
      on conflict (restaurant_id, table_id) where status = 'open' do nothing`);
  }
  statements.push(sql`
    insert into orders (id, restaurant_id, customer_id, number, type, table_label, table_session_id, items, subtotal_cents, discount_cents,
                        delivery_fee_cents, total_cents, coupon, promo_title, payment_method, payment_status, card_brand, card_last4,
                        customer_name, customer_phone, address, notes, created_by)
    select ${orderId}, ${restaurantId}, ${o.customerId ?? null}, coalesce(max(number), 0) + 1, ${table ? 'table' : 'delivery'}, ${table?.label ?? null},
           (select id from table_sessions where restaurant_id = ${restaurantId} and table_id = ${table?.id ?? null} and status = 'open'),
           ${JSON.stringify(items)}::jsonb, ${quote.subtotal}, ${quote.discount}, ${quote.deliveryFee}, ${quote.total},
           ${quote.coupon?.applied ? quote.coupon.code : null}, ${quote.promo ? tr(quote.promo.title, site.defaultLanguage) : null},
           ${o.paymentMethod}, ${o.payment?.status ?? 'pending'}, ${o.payment?.brand ?? null}, ${o.payment?.last4 ?? null},
           ${o.name ?? ''}, ${o.phone ?? ''}, ${o.address ? JSON.stringify(o.address) : null}::jsonb, ${o.notes ?? ''}, ${o.createdBy ?? null}
    from orders where restaurant_id = ${restaurantId}
    returning *`);

  const results = await sql.transaction(statements);
  return results.at(-1)[0];
}
