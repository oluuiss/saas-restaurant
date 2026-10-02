import { requireMember } from '../auth.js';
import { HttpError, readJson, sendJson } from '../http.js';
import { contractInfo } from '../../shared/contract.js';
import { computeScore } from '../../shared/policy.js';
import { isValidSlug } from '../../shared/slug.js';
import { SiteValidationError, nowInTimezone, publishChecklist, sanitizeSite } from '../../shared/site.js';

const UUID_RE = /^[0-9a-f-]{36}$/i;

/** Restaurante de quem está no painel, exigindo a permissão `cap` do cargo (shared/roles.js). */
async function ownRestaurant(sql, req, cap = 'site', options) {
  const member = await requireMember(sql, req, cap, options);
  const [restaurant] = await sql`
    select id, slug, draft, published_at, updated_at,
           (published is not null and published is distinct from draft) as has_changes
    from restaurants where id = ${member.restaurant.id}`;
  if (!restaurant) throw new HttpError(404, 'Restaurante não encontrado para esta conta.');
  return { member, restaurant };
}

// O site fica numa "pasta" do projeto: /<slug>
const view = (r) => ({
  id: r.id,
  slug: r.slug,
  path: `/${r.slug}`,
  publishedAt: r.published_at,
  hasUnpublishedChanges: Boolean(r.has_changes),
  updatedAt: r.updated_at,
});

/** GET /api/restaurant — documento em edição + estado de publicação. */
export async function getRestaurant({ req, res, sql }) {
  const { restaurant } = await ownRestaurant(sql, req);
  sendJson(res, 200, { ...view(restaurant), draft: sanitizeSite(restaurant.draft) });
}

/** PUT /api/restaurant/draft — salvamento do painel. */
export async function saveDraft({ req, res, sql }) {
  const { restaurant } = await ownRestaurant(sql, req);
  const body = await readJson(req, 1_500_000);
  let draft;
  try {
    draft = sanitizeSite(body.draft);
  } catch (error) {
    if (error instanceof SiteValidationError) throw new HttpError(400, error.message);
    throw error;
  }
  const [row] = await sql`
    update restaurants set draft = ${JSON.stringify(draft)}::jsonb, updated_at = now()
    where id = ${restaurant.id}
    returning updated_at, (published is not null and published is distinct from draft) as has_changes`;
  sendJson(res, 200, { updatedAt: row.updated_at, hasUnpublishedChanges: row.has_changes });
}

/** POST /api/restaurant/publish — copia o rascunho para o site público. */
export async function publish({ req, res, sql }) {
  const { restaurant } = await ownRestaurant(sql, req);
  const draft = sanitizeSite(restaurant.draft);
  const missing = publishChecklist(draft).filter((item) => item.required && !item.ok);
  if (missing.length) {
    throw new HttpError(400, `Antes de publicar: ${missing.map((m) => m.label.toLowerCase()).join(' e ')}.`, { missing: missing.map((m) => m.id) });
  }
  const [row] = await sql`
    update restaurants set draft = ${JSON.stringify(draft)}::jsonb, published = ${JSON.stringify(draft)}::jsonb, published_at = now()
    where id = ${restaurant.id}
    returning id, slug, published_at, updated_at, false as has_changes`;
  sendJson(res, 200, view(row));
}

async function slugTaken(sql, slug, restaurantId) {
  const [row] = await sql`select 1 from restaurants where slug = ${slug} and id <> ${restaurantId}`;
  return Boolean(row);
}

/** GET /api/restaurant/slug-check?slug= */
export async function checkSlug({ req, res, sql, query }) {
  const { restaurant } = await ownRestaurant(sql, req);
  const slug = String(query.get('slug') ?? '');
  const valid = isValidSlug(slug);
  sendJson(res, 200, { slug, valid, available: valid && !(await slugTaken(sql, slug, restaurant.id)) });
}

/** PUT /api/restaurant/slug — troca o endereço (a "pasta") do site. */
export async function changeSlug({ req, res, sql }) {
  const { restaurant } = await ownRestaurant(sql, req);
  const { slug } = await readJson(req);
  if (!isValidSlug(slug)) throw new HttpError(400, 'Use de 2 a 40 letras minúsculas, números e hífens (alguns nomes são reservados).');
  if (await slugTaken(sql, slug, restaurant.id)) throw new HttpError(409, 'Esse endereço já está em uso por outro restaurante.');
  const [row] = await sql`
    update restaurants set slug = ${slug} where id = ${restaurant.id}
    returning id, slug, published_at, updated_at, (published is not null and published is distinct from draft) as has_changes`;
  sendJson(res, 200, view(row));
}

/* ---------- Reservas ---------- */

/** GET /api/restaurant/reservations — próximas reservas e as de ontem (para marcar presença), com a nota do cliente. */
export async function listReservations({ req, res, sql }) {
  const { restaurant } = await ownRestaurant(sql, req, 'reservations');
  const today = nowInTimezone().date;
  const rows = await sql`
    with stats as (
      select c.id,
        (select count(*) from reservations x where x.customer_id = c.id and x.status = 'attended')::int as res_ok,
        (select count(*) from reservations x where x.customer_id = c.id and (x.status = 'no_show' or (x.status = 'canceled' and x.canceled_by = 'customer')))::int as res_bad,
        (select count(*) from orders o where o.customer_id = c.id and o.status = 'delivered')::int as ord_ok,
        (select count(*) from orders o where o.customer_id = c.id and o.status = 'canceled' and o.canceled_by = 'customer')::int as ord_bad
      from customers c where c.restaurant_id = ${restaurant.id}
    )
    select r.id, r.code, r.floor_id, r.table_label, to_char(r.date, 'YYYY-MM-DD') as date, to_char(r.time, 'HH24:MI') as time,
           r.party_size, r.customer_name, r.customer_phone, r.status, r.canceled_by, r.created_at, r.promo, r.customer_id,
           s.res_ok, s.res_bad, s.ord_ok, s.ord_bad
    from reservations r left join stats s on s.id = r.customer_id
    where r.restaurant_id = ${restaurant.id} and r.date >= (${today}::date - 1)
    order by r.date, r.time
    limit 300`;
  sendJson(res, 200, {
    today,
    reservations: rows.map((r) => ({
      id: r.id, code: r.code, floorId: r.floor_id, tableLabel: r.table_label, date: r.date, time: r.time,
      partySize: r.party_size, name: r.customer_name, phone: r.customer_phone, status: r.status, canceledBy: r.canceled_by,
      createdAt: r.created_at, promo: r.promo,
      score: r.customer_id ? computeScore({ resOk: r.res_ok, resBad: r.res_bad, ordOk: r.ord_ok, ordBad: r.ord_bad }) : null,
    })),
  });
}

/** POST /api/restaurant/reservations/:id/status — compareceu, não veio ou cancelada pelo restaurante. */
export async function setReservationStatus({ req, res, sql, params }) {
  const { member, restaurant } = await ownRestaurant(sql, req, 'reservations');
  if (!UUID_RE.test(params.id)) throw new HttpError(404, 'Reserva não encontrada.');
  const { status } = await readJson(req);
  if (!['attended', 'no_show', 'canceled', 'confirmed'].includes(status)) throw new HttpError(400, 'Status inválido.');
  const rows = await sql`
    update reservations
    set status = ${status},
        canceled_by = case when ${status} = 'canceled' then 'restaurant' else null end,
        canceled_at = case when ${status} = 'canceled' then now() else null end
    where id = ${params.id}::uuid and restaurant_id = ${restaurant.id}
    returning id, table_id, table_label, party_size`;
  if (!rows.length) throw new HttpError(404, 'Reserva não encontrada.');
  // Cliente chegou: a mesa reservada já fica ocupada (se estiver livre).
  let tableSessionId = null;
  if (status === 'attended') {
    const r = rows[0];
    const [opened] = await sql`
      insert into table_sessions (restaurant_id, table_id, table_label, people, reservation_id, opened_by)
      values (${restaurant.id}, ${r.table_id}, ${r.table_label}, ${r.party_size}, ${r.id}, ${member.name})
      on conflict (restaurant_id, table_id) where status = 'open' do nothing
      returning id`;
    tableSessionId = opened?.id ?? null;
  }
  sendJson(res, 200, { ok: true, tableSessionId });
}

/* ---------- Pedidos e chamados ---------- */

const NEXT_STATUSES = ['received', 'preparing', 'out_for_delivery', 'ready', 'delivered', 'canceled'];

/** GET /api/restaurant/orders?scope=active|today */
export async function listOrders({ req, res, sql, query }) {
  const { restaurant } = await ownRestaurant(sql, req, ['orders', 'tables']);
  const scope = query.get('scope') === 'today' ? 'today' : 'active';
  const orders = scope === 'active'
    ? await sql`select * from orders where restaurant_id = ${restaurant.id} and status not in ('delivered', 'canceled') order by created_at limit 200`
    : await sql`select * from orders where restaurant_id = ${restaurant.id} and created_at > now() - interval '24 hours' order by created_at desc limit 200`;
  const calls = await sql`select id, table_label, created_at from service_calls where restaurant_id = ${restaurant.id} and status = 'open' order by created_at`;
  sendJson(res, 200, {
    orders: orders.map((o) => ({
      id: o.id, number: o.number, type: o.type, table: o.table_label, status: o.status, items: o.items,
      subtotal: o.subtotal_cents, discount: o.discount_cents, deliveryFee: o.delivery_fee_cents, total: o.total_cents,
      coupon: o.coupon, promoTitle: o.promo_title, paymentMethod: o.payment_method, paymentStatus: o.payment_status,
      cardBrand: o.card_brand, cardLast4: o.card_last4, name: o.customer_name, phone: o.customer_phone,
      address: o.address, notes: o.notes, canceledBy: o.canceled_by, createdAt: o.created_at, createdBy: o.created_by,
    })),
    calls: calls.map((c) => ({ id: c.id, table: c.table_label, createdAt: c.created_at })),
  });
}

/** POST /api/restaurant/orders/:id/status */
export async function setOrderStatus({ req, res, sql, params }) {
  const { restaurant } = await ownRestaurant(sql, req, 'orders');
  if (!UUID_RE.test(params.id)) throw new HttpError(404, 'Pedido não encontrado.');
  const { status } = await readJson(req);
  if (!NEXT_STATUSES.includes(status)) throw new HttpError(400, 'Status inválido.');
  const rows = await sql`
    update orders
    set status = ${status}, updated_at = now(),
        canceled_by = case when ${status} = 'canceled' then 'restaurant' else canceled_by end,
        payment_status = case when ${status} = 'delivered' and type = 'delivery' then 'paid' else payment_status end
    where id = ${params.id}::uuid and restaurant_id = ${restaurant.id}
    returning id`;
  if (!rows.length) throw new HttpError(404, 'Pedido não encontrado.');
  sendJson(res, 200, { ok: true });
}

/** POST /api/restaurant/calls/:id/done */
export async function closeCall({ req, res, sql, params }) {
  const { restaurant } = await ownRestaurant(sql, req, ['tables', 'orders']);
  if (!UUID_RE.test(params.id)) throw new HttpError(404, 'Chamado não encontrado.');
  await sql`update service_calls set status = 'done', done_at = now() where id = ${params.id}::uuid and restaurant_id = ${restaurant.id}`;
  sendJson(res, 200, { ok: true });
}

/** GET /api/restaurant/activity — contadores para os avisos do painel. */
export async function activity({ req, res, sql }) {
  const { restaurant } = await ownRestaurant(sql, req, null);
  const [row] = await sql`
    select
      (select count(*) from orders where restaurant_id = ${restaurant.id} and status not in ('delivered', 'canceled'))::int as open_orders,
      (select count(*) from orders where restaurant_id = ${restaurant.id} and status = 'received')::int as new_orders,
      (select count(*) from service_calls where restaurant_id = ${restaurant.id} and status = 'open')::int as open_calls,
      (select max(number) from orders where restaurant_id = ${restaurant.id}) as last_order`;
  sendJson(res, 200, { openOrders: row.open_orders, newOrders: row.new_orders, openCalls: row.open_calls, lastOrder: row.last_order });
}

/** GET /api/restaurant/billing — assinatura e pagamentos. */
export async function billing({ req, res, sql }) {
  const { member } = await ownRestaurant(sql, req, 'billing', { allowEnded: true });
  const accountId = member.restaurant.ownerId;
  const [subscription] = await sql`
    select plan, status, price_cents, created_at, contract_months, cancel_at, cancel_requested_at, terms_accepted_at from subscriptions
    where account_id = ${accountId} order by created_at desc limit 1`;
  const payments = await sql`
    select amount_cents, method, status, card_brand, card_last4, created_at from payments
    where account_id = ${accountId} order by created_at desc limit 24`;
  sendJson(res, 200, {
    subscription: subscription && {
      plan: subscription.plan, status: subscription.status, priceCents: subscription.price_cents,
      startedAt: subscription.created_at, termsAcceptedAt: subscription.terms_accepted_at,
      cancelRequestedAt: subscription.cancel_requested_at,
      contract: contractInfo({ startedAt: subscription.created_at, contractMonths: subscription.contract_months, cancelAt: subscription.cancel_at }),
    },
    payments: payments.map((p) => ({
      amountCents: p.amount_cents, method: p.method, status: p.status, brand: p.card_brand, last4: p.card_last4, createdAt: p.created_at,
    })),
  });
}
