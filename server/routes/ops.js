import { requireMember } from '../auth.js';
import { HttpError, readJson, sendJson } from '../http.js';
import { insertOrder } from '../orders.js';
import { allTables } from '../../shared/floor.js';
import { tr } from '../../shared/i18n.js';
import { computeScore } from '../../shared/policy.js';
import { quoteOrder } from '../../shared/pricing.js';
import { nowInTimezone, sanitizeSite, withSoldOut } from '../../shared/site.js';

// Operação do dia a dia: salão (mesas ocupadas e contas), pedidos da equipe, esgotados e clientes.

const UUID_RE = /^[0-9a-f-]{36}$/i;
const TZ = 'America/Sao_Paulo';
const PAYMENT_METHODS = ['credit', 'debit', 'pix', 'cash', 'other'];
export const DEFAULT_SERVICE_FEE = 10;

export const serviceFeeOf = (settings) => {
  const fee = Number(settings?.serviceFee);
  return Number.isFinite(fee) ? Math.min(30, Math.max(0, fee)) : DEFAULT_SERVICE_FEE;
};

/** Restaurante de quem está no painel + o site que os clientes veem (publicado, ou o rascunho se ainda não publicou). */
async function load(sql, req, cap, options) {
  const member = await requireMember(sql, req, cap, options);
  const [row] = await sql`select id, slug, draft, published, settings, sold_out from restaurants where id = ${member.restaurant.id}`;
  const site = withSoldOut(sanitizeSite(row.published ?? row.draft), row.sold_out);
  return { member, restaurant: row, site, soldOut: new Set(row.sold_out ?? []), serviceFee: serviceFeeOf(row.settings) };
}

/** GET /api/ops/context — mesas, cardápio e configurações usados pelas telas da operação. */
export async function context({ req, res, sql }) {
  const { restaurant, site, soldOut, serviceFee } = await load(sql, req, null, { allowEnded: true });
  const lang = site.defaultLanguage;
  const floorName = new Map(site.floors.map((f) => [f.id, tr(f.name, lang)]));
  sendJson(res, 200, {
    slug: restaurant.slug,
    language: lang,
    tables: allTables(site).map((t) => ({ id: t.id, label: t.label, seats: t.seats, floorId: t.floorId, floorName: floorName.get(t.floorId) })),
    floors: site.floors.map((f) => ({ id: f.id, name: floorName.get(f.id) })),
    menu: {
      categories: site.menu.categories.map((c) => ({ id: c.id, name: tr(c.name, lang) })),
      items: site.menu.items.map((i) => ({
        id: i.id, categoryId: i.categoryId, name: tr(i.name, lang), price: i.price, image: i.image,
        soldOut: soldOut.has(i.id), hidden: !soldOut.has(i.id) && !i.available,
      })),
    },
    settings: { serviceFee },
  });
}

const todayBr = () => nowInTimezone().date;

/** GET /api/ops/overview — tudo o que a página inicial mostra (atualiza a cada poucos segundos). */
export async function overview({ req, res, sql }) {
  const { member, restaurant } = await load(sql, req, null);
  const rid = restaurant.id;
  const today = todayBr();
  const [sessions, calls, deliveries, reservations, [counts]] = await Promise.all([
    sql`
      select ts.id, ts.table_id, ts.table_label, ts.people, ts.opened_at, ts.opened_by, ts.reservation_id,
             coalesce(sum(o.total_cents) filter (where o.status <> 'canceled'), 0)::int as subtotal,
             count(o.id) filter (where o.status <> 'canceled')::int as orders,
             count(o.id) filter (where o.status in ('received', 'preparing'))::int as pending
      from table_sessions ts left join orders o on o.table_session_id = ts.id
      where ts.restaurant_id = ${rid} and ts.status = 'open'
      group by ts.id order by ts.opened_at`,
    sql`select id, table_label, created_at from service_calls where restaurant_id = ${rid} and status = 'open' order by created_at`,
    sql`
      select id, number, status, total_cents, customer_name, address, payment_method, payment_status, created_at
      from orders where restaurant_id = ${rid} and type = 'delivery' and status not in ('delivered', 'canceled')
      order by created_at`,
    sql`
      select id, table_id, table_label, to_char(time, 'HH24:MI') as time, party_size, customer_name, customer_phone, status
      from reservations where restaurant_id = ${rid} and date = ${today}::date and status in ('confirmed', 'attended')
      order by time`,
    sql`
      select
        (select count(*) from orders where restaurant_id = ${rid} and status = 'received')::int as new_orders,
        (select count(*) from orders where restaurant_id = ${rid} and status in ('received', 'preparing', 'ready', 'out_for_delivery'))::int as open_orders,
        (select coalesce(sum(people), 0) from table_sessions
           where restaurant_id = ${rid} and (opened_at at time zone ${TZ})::date = ${today}::date)::int as people_today,
        (select coalesce(sum(subtotal_cents), 0) from table_sessions
           where restaurant_id = ${rid} and status = 'closed' and (closed_at at time zone ${TZ})::date = ${today}::date)::int as hall_today,
        (select coalesce(sum(total_cents), 0) from orders
           where restaurant_id = ${rid} and type = 'delivery' and status = 'delivered' and (created_at at time zone ${TZ})::date = ${today}::date)::int as delivery_today`,
  ]);

  sendJson(res, 200, {
    today,
    sessions: sessions.map((s) => ({
      id: s.id, tableId: s.table_id, table: s.table_label, people: s.people, openedAt: s.opened_at, openedBy: s.opened_by,
      reservationId: s.reservation_id, subtotal: s.subtotal, orders: s.orders, pending: s.pending,
    })),
    calls: calls.map((c) => ({ id: c.id, table: c.table_label, createdAt: c.created_at })),
    deliveries: deliveries.map((o) => ({
      id: o.id, number: o.number, status: o.status, total: o.total_cents, name: o.customer_name,
      district: o.address?.district ?? '', paid: o.payment_status === 'paid', createdAt: o.created_at,
    })),
    reservations: reservations.map((r) => ({
      id: r.id, tableId: r.table_id, table: r.table_label, time: r.time, people: r.party_size, name: r.customer_name, phone: r.customer_phone, status: r.status,
    })),
    counts: { newOrders: counts.new_orders, openOrders: counts.open_orders, peopleToday: counts.people_today },
    // Faturamento só para quem vê o financeiro.
    revenueToday: member.caps.includes('finance') ? counts.hall_today + counts.delivery_today : null,
  });
}

/* ---------- Mesas ocupadas e conta ---------- */

async function ownSession(sql, restaurantId, id, { open = true } = {}) {
  if (!UUID_RE.test(id)) throw new HttpError(404, 'Mesa não encontrada.');
  const [row] = await sql`select * from table_sessions where id = ${id}::uuid and restaurant_id = ${restaurantId}`;
  if (!row) throw new HttpError(404, 'Essa mesa já foi fechada ou liberada.');
  if (open && row.status !== 'open') throw new HttpError(409, 'Essa conta já foi fechada.');
  return row;
}

const peopleOf = (value) => Math.max(0, Math.min(99, Math.round(Number(value) || 0)));

/** Conta da mesa: itens agrupados, subtotal, taxa de serviço e total. */
function bill(orders, serviceFee, includeService = true) {
  const valid = orders.filter((o) => o.status !== 'canceled');
  const grouped = new Map();
  for (const o of valid) {
    for (const i of o.items) {
      const key = `${i.itemId}:${i.unit}`;
      const g = grouped.get(key) ?? { itemId: i.itemId, name: i.name, unit: i.unit, qty: 0, total: 0 };
      g.qty += i.qty;
      g.total += i.total;
      grouped.set(key, g);
    }
  }
  const subtotal = valid.reduce((sum, o) => sum + o.total_cents, 0);
  const service = includeService ? Math.round((subtotal * serviceFee) / 100) : 0;
  return { items: [...grouped.values()], subtotal, serviceFee, service, total: subtotal + service };
}

async function sessionView(sql, session, serviceFee, lang) {
  const orders = await sql`select * from orders where table_session_id = ${session.id} order by created_at`;
  const b = bill(orders, serviceFee);
  return {
    session: {
      id: session.id, tableId: session.table_id, table: session.table_label, people: session.people, status: session.status,
      openedAt: session.opened_at, openedBy: session.opened_by, reservationId: session.reservation_id,
      closedAt: session.closed_at, closedBy: session.closed_by, paymentMethod: session.payment_method,
    },
    orders: orders.map((o) => ({
      id: o.id, number: o.number, status: o.status, total: o.total_cents, createdAt: o.created_at, createdBy: o.created_by,
      items: o.items.map((i) => ({ ...i, name: tr(i.name, lang) })),
    })),
    bill: { ...b, items: b.items.map((i) => ({ ...i, name: tr(i.name, lang) })) },
  };
}

/** POST /api/ops/tables/open — { tableId, people, reservationId? } */
export async function openTable({ req, res, sql }) {
  const { member, restaurant, site, serviceFee } = await load(sql, req, 'tables');
  const body = await readJson(req);
  const table = allTables(site).find((t) => t.id === body.tableId);
  if (!table) throw new HttpError(404, 'Mesa não encontrada.');

  let reservationId = null;
  if (body.reservationId) {
    if (!UUID_RE.test(body.reservationId)) throw new HttpError(400, 'Reserva inválida.');
    const [r] = await sql`select id from reservations where id = ${body.reservationId}::uuid and restaurant_id = ${restaurant.id} and status in ('confirmed', 'attended')`;
    if (!r) throw new HttpError(404, 'Reserva não encontrada.');
    reservationId = r.id;
  }

  const [session] = await sql`
    insert into table_sessions (restaurant_id, table_id, table_label, people, reservation_id, opened_by)
    values (${restaurant.id}, ${table.id}, ${table.label}, ${peopleOf(body.people)}, ${reservationId}, ${member.name})
    on conflict (restaurant_id, table_id) where status = 'open' do nothing
    returning *`;
  if (!session) {
    const [open] = await sql`select id from table_sessions where restaurant_id = ${restaurant.id} and table_id = ${table.id} and status = 'open'`;
    throw new HttpError(409, `A mesa ${table.label} já está ocupada.`, { sessionId: open?.id });
  }
  if (reservationId) await sql`update reservations set status = 'attended', canceled_by = null, canceled_at = null where id = ${reservationId}`;
  sendJson(res, 201, await sessionView(sql, session, serviceFee, site.defaultLanguage));
}

/** GET /api/ops/sessions/:id */
export async function getSession({ req, res, sql, params }) {
  const { restaurant, site, serviceFee } = await load(sql, req, ['tables', 'checkout']);
  const session = await ownSession(sql, restaurant.id, params.id, { open: false });
  sendJson(res, 200, await sessionView(sql, session, serviceFee, site.defaultLanguage));
}

/** PUT /api/ops/sessions/:id — { people } */
export async function updateSession({ req, res, sql, params }) {
  const { restaurant, site, serviceFee } = await load(sql, req, 'tables');
  const session = await ownSession(sql, restaurant.id, params.id);
  const [row] = await sql`update table_sessions set people = ${peopleOf((await readJson(req)).people)} where id = ${session.id} returning *`;
  sendJson(res, 200, await sessionView(sql, row, serviceFee, site.defaultLanguage));
}

/** POST /api/ops/sessions/:id/orders — a equipe lança um pedido na mesa: { lines, notes } */
export async function addSessionOrder({ req, res, sql, params }) {
  const { member, restaurant, site, serviceFee } = await load(sql, req, 'tables');
  const session = await ownSession(sql, restaurant.id, params.id);
  const body = await readJson(req, 200_000);
  const quote = quoteOrder(site, { lines: body.lines, mode: 'table' });
  if (quote.errors.includes('unavailable')) throw new HttpError(409, 'Algum prato acabou de ficar esgotado. Revise o pedido.');
  if (!quote.lines.length) throw new HttpError(400, 'Escolha pelo menos um prato.');
  await insertOrder(sql, restaurant.id, site, {
    quote,
    table: { id: session.table_id, label: session.table_label },
    paymentMethod: 'at_table',
    notes: String(body.notes ?? '').trim().slice(0, 300),
    createdBy: member.name,
  });
  sendJson(res, 201, await sessionView(sql, session, serviceFee, site.defaultLanguage));
}

/** POST /api/ops/sessions/:id/release — libera uma mesa ocupada por engano (sem pedidos). */
export async function releaseSession({ req, res, sql, params }) {
  const { restaurant } = await load(sql, req, 'tables');
  const session = await ownSession(sql, restaurant.id, params.id);
  const [{ count }] = await sql`select count(*)::int as count from orders where table_session_id = ${session.id} and status <> 'canceled'`;
  if (count) throw new HttpError(409, 'A mesa tem pedidos. Feche a conta em vez de liberar.');
  await sql`delete from table_sessions where id = ${session.id}`;
  sendJson(res, 200, { ok: true });
}

/**
 * POST /api/ops/sessions/:id/close — fecha a conta. O pagamento é feito na maquininha do restaurante;
 * aqui só registramos o valor, a taxa de serviço e a forma de pagamento. { includeService, paymentMethod }
 */
export async function closeSession({ req, res, sql, params }) {
  const { member, restaurant, site, serviceFee } = await load(sql, req, 'checkout');
  const session = await ownSession(sql, restaurant.id, params.id);
  const body = await readJson(req);
  const paymentMethod = PAYMENT_METHODS.includes(body.paymentMethod) ? body.paymentMethod : 'other';
  const orders = await sql`select * from orders where table_session_id = ${session.id}`;
  const b = bill(orders, serviceFee, body.includeService !== false);

  const [, closed] = await sql.transaction([
    sql`update orders set status = 'delivered', payment_status = 'paid', updated_at = now()
        where table_session_id = ${session.id} and status <> 'canceled'`,
    sql`update table_sessions
        set status = 'closed', closed_at = now(), closed_by = ${member.name}, payment_method = ${paymentMethod},
            subtotal_cents = ${b.subtotal}, service_cents = ${b.service}, total_cents = ${b.total}
        where id = ${session.id} and status = 'open'
        returning *`,
    sql`update service_calls set status = 'done', done_at = now()
        where restaurant_id = ${restaurant.id} and table_label = ${session.table_label} and status = 'open'`,
  ]);
  if (!closed.length) throw new HttpError(409, 'Essa conta já foi fechada.');
  sendJson(res, 200, await sessionView(sql, closed[0], serviceFee, site.defaultLanguage));
}

/* ---------- Cardápio do dia ---------- */

/** PUT /api/ops/menu/:itemId — { soldOut } vale na hora no site, sem publicar. */
export async function setSoldOut({ req, res, sql, params }) {
  const { restaurant, site } = await load(sql, req, 'menu');
  const item = site.menu.items.find((i) => i.id === params.itemId);
  if (!item) throw new HttpError(404, 'Prato não encontrado.');
  const { soldOut } = await readJson(req);
  const [row] = await sql`
    update restaurants
    set sold_out = case
      when ${Boolean(soldOut)} then (case when sold_out ? ${item.id} then sold_out else sold_out || jsonb_build_array(${item.id}::text) end)
      else sold_out - ${item.id}::text end
    where id = ${restaurant.id}
    returning sold_out`;
  sendJson(res, 200, { soldOut: row.sold_out });
}

/** POST /api/ops/menu/reset — todos os pratos voltam a ficar disponíveis (início do dia). */
export async function resetSoldOut({ req, res, sql }) {
  const { restaurant } = await load(sql, req, 'menu');
  await sql`update restaurants set sold_out = '[]'::jsonb where id = ${restaurant.id}`;
  sendJson(res, 200, { soldOut: [] });
}

/* ---------- Configurações da operação ---------- */

/** PUT /api/ops/settings — { serviceFee } */
export async function updateSettings({ req, res, sql }) {
  const { restaurant } = await load(sql, req, 'settings');
  const body = await readJson(req);
  const fee = Number(body.serviceFee);
  if (!Number.isFinite(fee) || fee < 0 || fee > 30) throw new HttpError(400, 'A taxa de serviço vai de 0% a 30%.', { fields: { serviceFee: 'De 0% a 30%.' } });
  const serviceFee = Math.round(fee * 10) / 10;
  await sql`update restaurants set settings = settings || ${JSON.stringify({ serviceFee })}::jsonb where id = ${restaurant.id}`;
  sendJson(res, 200, { settings: { serviceFee } });
}

/* ---------- Clientes ---------- */

/** GET /api/ops/customers?q= — clientes com conta no site, nota e histórico. */
export async function customers({ req, res, sql, query }) {
  const { restaurant } = await load(sql, req, 'customers');
  const q = String(query.get('q') ?? '').trim().slice(0, 80);
  const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const rows = await sql`
    select c.id, c.name, c.email, c.phone, c.created_at,
      (select count(*) from reservations where customer_id = c.id and status = 'attended')::int as res_ok,
      (select count(*) from reservations where customer_id = c.id and (status = 'no_show' or (status = 'canceled' and canceled_by = 'customer')))::int as res_bad,
      (select count(*) from orders where customer_id = c.id and status = 'delivered')::int as ord_ok,
      (select count(*) from orders where customer_id = c.id and status = 'canceled' and canceled_by = 'customer')::int as ord_bad,
      (select coalesce(sum(total_cents), 0) from orders where customer_id = c.id and status = 'delivered')::int as spent,
      greatest(
        (select max(created_at) from orders where customer_id = c.id),
        (select max(date + time) from reservations where customer_id = c.id)
      ) as last_activity
    from customers c
    where c.restaurant_id = ${restaurant.id}
      and (${q} = '' or c.name ilike ${like} or c.email ilike ${like} or c.phone ilike ${like})
    order by last_activity desc nulls last, c.created_at desc
    limit 300`;
  sendJson(res, 200, {
    customers: rows.map((c) => ({
      id: c.id, name: c.name, email: c.email, phone: c.phone, createdAt: c.created_at,
      reservations: c.res_ok, noShows: c.res_bad, orders: c.ord_ok, canceledOrders: c.ord_bad, spent: c.spent, lastActivity: c.last_activity,
      score: computeScore({ resOk: c.res_ok, resBad: c.res_bad, ordOk: c.ord_ok, ordBad: c.ord_bad }),
    })),
  });
}
