import crypto from 'node:crypto';
import { checkPassword, hashPassword } from '../auth.js';
import { currentCustomer, customerStats, endCustomerSession, newCustomerSession, requireCustomer } from '../customers.js';
import { EMAIL_RE, HttpError, assertFields, readJson, sendJson } from '../http.js';
import { allTables, findTable } from '../../shared/floor.js';
import { tr } from '../../shared/i18n.js';
import { canCustomerCancel, cancelDeadline, computeScore } from '../../shared/policy.js';
import { quoteOrder, reservationDeal } from '../../shared/pricing.js';
import { processTestPayment, validateCard } from '../../shared/payments.js';
import { isValidSlug } from '../../shared/slug.js';
import { reservationSlots, reservationWindow, sanitizeSite, withSoldOut } from '../../shared/site.js';
import { contractInfo } from '../../shared/contract.js';
import { insertOrder } from '../orders.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f-]{36}$/i;

/**
 * Restaurante publicado pelo slug (o documento passa pela normalização para ganhar campos novos).
 * Pratos marcados como esgotados no painel ficam indisponíveis na hora; assinatura encerrada tira o site do ar.
 */
async function tenant(sql, slug) {
  if (!isValidSlug(slug)) throw new HttpError(404, 'Site não encontrado.');
  const [row] = await sql`
    select r.id, r.slug, r.published, r.sold_out, sub.created_at as sub_started, sub.contract_months, sub.cancel_at
    from restaurants r
    left join lateral (
      select created_at, contract_months, cancel_at from subscriptions
      where account_id = r.account_id order by created_at desc limit 1
    ) sub on true
    where r.slug = ${slug} and r.published is not null`;
  if (!row) throw new HttpError(404, 'Site não encontrado.');
  if (row.cancel_at && contractInfo({ startedAt: row.sub_started, contractMonths: row.contract_months, cancelAt: row.cancel_at }).ended) {
    throw new HttpError(404, 'Este site não está mais disponível.');
  }
  return { id: row.id, slug: row.slug, site: withSoldOut(sanitizeSite(row.published), row.sold_out) };
}

function assertBookable(site, date, time) {
  if (!site.reservations?.enabled) throw new HttpError(400, 'As reservas online estão desativadas.');
  const { first, last } = reservationWindow(site);
  if (!DATE_RE.test(date) || date < first || date > last) throw new HttpError(400, 'Escolha uma data dentro do período de reservas.');
  if (!reservationSlots(site, date).includes(time)) throw new HttpError(400, 'Esse horário não está disponível para reserva.');
}

const reservationView = (r) => {
  const item = {
    id: r.id, code: r.code, tableLabel: r.table_label, date: r.date, time: r.time, partySize: r.party_size,
    status: r.status, createdAt: r.created_at, promo: r.promo ?? null,
  };
  return { ...item, canCancel: canCustomerCancel(item), cancelUntil: new Date(cancelDeadline(item)).toISOString() };
};

const orderView = (o) => ({
  id: o.id, number: o.number, type: o.type, table: o.table_label, status: o.status, items: o.items,
  subtotal: o.subtotal_cents, discount: o.discount_cents, deliveryFee: o.delivery_fee_cents, total: o.total_cents,
  coupon: o.coupon, paymentMethod: o.payment_method, paymentStatus: o.payment_status, createdAt: o.created_at, updatedAt: o.updated_at,
});

/* ---------- Site ---------- */

export async function getSite({ res, sql, params }) {
  const { slug, site } = await tenant(sql, params.slug);
  sendJson(res, 200, { slug, site });
}

export async function availability({ res, sql, params, query }) {
  const { id, site } = await tenant(sql, params.slug);
  const date = String(query.get('date') ?? '');
  const time = String(query.get('time') ?? '');
  assertBookable(site, date, time);
  const duration = site.reservations.durationMinutes;
  const rows = await sql`
    select distinct table_id from reservations
    where restaurant_id = ${id} and date = ${date}::date and status in ('confirmed', 'attended')
      and abs(extract(epoch from (time - ${time}::time))) / 60 < ${duration}`;
  sendJson(res, 200, { busy: rows.map((r) => r.table_id) });
}

/* ---------- Conta do cliente ---------- */

async function meView(sql, customer) {
  const stats = await customerStats(sql, customer.id);
  return { customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, score: computeScore(stats), stats } };
}

export async function customerMe({ req, res, sql, params }) {
  const { id } = await tenant(sql, params.slug);
  const customer = await currentCustomer(sql, req, id);
  sendJson(res, 200, customer ? await meView(sql, customer) : { customer: null });
}

export async function customerRegister({ req, res, sql, params }) {
  const { id, slug } = await tenant(sql, params.slug);
  const body = await readJson(req);
  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const phone = String(body.phone ?? '').trim();
  const password = String(body.password ?? '');
  assertFields({
    ...(name.length >= 2 && name.length <= 80 ? {} : { name: 'Informe seu nome.' }),
    ...(EMAIL_RE.test(email) && email.length <= 120 ? {} : { email: 'Informe um e-mail válido.' }),
    ...(phone.replace(/\D/g, '').length >= 8 && phone.length <= 30 ? {} : { phone: 'Informe um celular válido.' }),
    ...(password.length >= 8 && password.length <= 72 ? {} : { password: 'A senha precisa ter pelo menos 8 caracteres.' }),
  });
  const [exists] = await sql`select 1 from customers where restaurant_id = ${id} and email = ${email}`;
  if (exists) throw new HttpError(409, 'Já existe uma conta com esse e-mail.', { fields: { email: 'Já existe uma conta com esse e-mail.' } });

  const customerId = crypto.randomUUID();
  const session = newCustomerSession(sql, req, res, customerId, slug);
  await sql.transaction([
    sql`insert into customers (id, restaurant_id, name, email, phone, password_hash)
        values (${customerId}, ${id}, ${name}, ${email}, ${phone}, ${await hashPassword(password)})`,
    session.query,
  ]);
  session.commit();
  sendJson(res, 201, await meView(sql, { id: customerId, name, email, phone }));
}

let dummyHash;

export async function customerLogin({ req, res, sql, params }) {
  const { id, slug } = await tenant(sql, params.slug);
  const body = await readJson(req);
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const [customer] = await sql`select id, name, email, phone, password_hash from customers where restaurant_id = ${id} and email = ${email}`;
  dummyHash ??= await hashPassword(crypto.randomUUID());
  const ok = await checkPassword(password, customer?.password_hash ?? dummyHash);
  if (!customer || !ok) throw new HttpError(401, 'E-mail ou senha incorretos.');
  const session = newCustomerSession(sql, req, res, customer.id, slug);
  await session.query;
  session.commit();
  sendJson(res, 200, await meView(sql, customer));
}

export async function customerLogout({ req, res, sql, params }) {
  await endCustomerSession(sql, req, res, params.slug);
  sendJson(res, 200, { ok: true });
}

export async function myReservations({ req, res, sql, params }) {
  const { id } = await tenant(sql, params.slug);
  const customer = await requireCustomer(sql, req, id);
  const rows = await sql`
    select id, code, table_label, to_char(date, 'YYYY-MM-DD') as date, to_char(time, 'HH24:MI') as time,
           party_size, status, created_at, promo
    from reservations where restaurant_id = ${id} and customer_id = ${customer.id}
    order by date desc, time desc limit 50`;
  sendJson(res, 200, { reservations: rows.map(reservationView) });
}

export async function cancelMyReservation({ req, res, sql, params }) {
  const { id } = await tenant(sql, params.slug);
  const customer = await requireCustomer(sql, req, id);
  if (!UUID_RE.test(params.id)) throw new HttpError(404, 'Reserva não encontrada.');
  const [row] = await sql`
    select id, code, table_label, to_char(date, 'YYYY-MM-DD') as date, to_char(time, 'HH24:MI') as time, party_size, status, created_at, promo
    from reservations where id = ${params.id}::uuid and restaurant_id = ${id} and customer_id = ${customer.id}`;
  if (!row) throw new HttpError(404, 'Reserva não encontrada.');
  if (row.status !== 'confirmed') throw new HttpError(409, 'Esta reserva não pode mais ser cancelada.');
  if (!canCustomerCancel(reservationView(row))) throw new HttpError(409, 'O prazo para cancelar esta reserva já passou.');
  await sql`update reservations set status = 'canceled', canceled_by = 'customer', canceled_at = now() where id = ${row.id} and status = 'confirmed'`;
  sendJson(res, 200, { ok: true });
}

export async function myOrders({ req, res, sql, params }) {
  const { id } = await tenant(sql, params.slug);
  const customer = await requireCustomer(sql, req, id);
  const rows = await sql`select * from orders where restaurant_id = ${id} and customer_id = ${customer.id} order by created_at desc limit 50`;
  sendJson(res, 200, { orders: rows.map(orderView) });
}

export async function cancelMyOrder({ req, res, sql, params }) {
  const { id } = await tenant(sql, params.slug);
  const customer = await requireCustomer(sql, req, id);
  if (!UUID_RE.test(params.id)) throw new HttpError(404, 'Pedido não encontrado.');
  const rows = await sql`
    update orders set status = 'canceled', canceled_by = 'customer', updated_at = now()
    where id = ${params.id}::uuid and restaurant_id = ${id} and customer_id = ${customer.id} and status = 'received'
    returning id`;
  if (!rows.length) throw new HttpError(409, 'Este pedido já está sendo preparado e não pode mais ser cancelado.');
  sendJson(res, 200, { ok: true });
}

/* ---------- Reservas ---------- */

export async function createReservation({ req, res, sql, params }) {
  const { id, site } = await tenant(sql, params.slug);
  const customer = await requireCustomer(sql, req, id);
  const body = await readJson(req);
  const date = String(body.date ?? '');
  const time = String(body.time ?? '');
  const partySize = Number(body.partySize);
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 50) throw new HttpError(400, 'Número de pessoas inválido.');
  assertBookable(site, date, time);

  const table = allTables(site).find((t) => t.id === body.tableId);
  if (!table) throw new HttpError(400, 'Mesa não encontrada.');
  if (table.seats < partySize) throw new HttpError(400, 'Essa mesa é pequena para o seu grupo.');

  const deal = reservationDeal(site, { date, time });
  const promo = deal ? { title: tr(deal.title, site.defaultLanguage), code: deal.code || null } : null;
  const duration = site.reservations.durationMinutes;
  const code = crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
  const lockKey = `${id}:${table.id}:${date}`;
  const [, inserted] = await sql.transaction([
    sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`,
    sql`
      insert into reservations (restaurant_id, customer_id, code, floor_id, table_id, table_label, date, time, party_size, customer_name, customer_phone, promo)
      select ${id}, ${customer.id}, ${code}, ${table.floorId}, ${table.id}, ${table.label}, ${date}::date, ${time}::time, ${partySize},
             ${customer.name}, ${customer.phone}, ${promo ? JSON.stringify(promo) : null}::jsonb
      where not exists (
        select 1 from reservations
        where restaurant_id = ${id} and table_id = ${table.id} and date = ${date}::date and status in ('confirmed', 'attended')
          and abs(extract(epoch from (time - ${time}::time))) / 60 < ${duration}
      )
      returning id, created_at`,
  ]);
  if (!inserted.length) throw new HttpError(409, 'Essa mesa acabou de ser reservada. Escolha outra.');

  const item = { date, time, createdAt: inserted[0].created_at };
  sendJson(res, 201, { id: inserted[0].id, code, tableLabel: table.label, date, time, partySize, promo, cancelUntil: new Date(cancelDeadline(item)).toISOString() });
}

/* ---------- Atendimento na mesa ---------- */

export async function checkTable({ req, res, sql, params }) {
  const { site } = await tenant(sql, params.slug);
  if (!site.tableService.enabled) throw new HttpError(400, 'O atendimento pela mesa está desativado.');
  const { table: typed } = await readJson(req);
  const table = findTable(site, typed);
  if (!table) throw new HttpError(404, 'Mesa não encontrada.');
  sendJson(res, 200, { table: table.label });
}

export async function callWaiter({ req, res, sql, params }) {
  const { id, site } = await tenant(sql, params.slug);
  if (!site.tableService.enabled || !site.tableService.call) throw new HttpError(400, 'Chamar atendente está desativado.');
  const { table: typed } = await readJson(req);
  const table = findTable(site, typed);
  if (!table) throw new HttpError(404, 'Mesa não encontrada.');
  // Um chamado aberto por mesa: chamar de novo só "renova" o horário.
  const [open] = await sql`select id from service_calls where restaurant_id = ${id} and table_label = ${table.label} and status = 'open'`;
  if (open) await sql`update service_calls set created_at = now() where id = ${open.id}`;
  else await sql`insert into service_calls (restaurant_id, table_label) values (${id}, ${table.label})`;
  sendJson(res, 201, { ok: true });
}

/* ---------- Pedidos ---------- */

export async function createOrder({ req, res, sql, params }) {
  const { id, site } = await tenant(sql, params.slug);
  const body = await readJson(req, 200_000);
  const mode = body.mode === 'table' ? 'table' : 'delivery';
  const customer = await currentCustomer(sql, req, id);

  let table = null;
  let address = null;
  let paymentMethod;
  if (mode === 'delivery') {
    if (!customer) throw new HttpError(401, 'Entre na sua conta para pedir delivery.');
    if (!site.delivery.enabled) throw new HttpError(400, 'O delivery não está disponível agora.');
    const a = body.address ?? {};
    address = {
      street: String(a.street ?? '').trim().slice(0, 160),
      complement: String(a.complement ?? '').trim().slice(0, 80),
      district: String(a.district ?? '').trim().slice(0, 80),
      city: String(a.city ?? '').trim().slice(0, 80),
      reference: String(a.reference ?? '').trim().slice(0, 120),
    };
    assertFields({
      ...(address.street.length >= 4 ? {} : { street: 'Informe a rua e o número.' }),
      ...(address.district.length >= 2 ? {} : { district: 'Informe o bairro.' }),
    });
    paymentMethod = body.payment?.method === 'online' ? 'online' : 'on_delivery';
    if (paymentMethod === 'online' && !site.delivery.payOnline) throw new HttpError(400, 'Pagamento online indisponível.');
    if (paymentMethod === 'on_delivery' && !site.delivery.payOnDelivery) throw new HttpError(400, 'Pagamento na entrega indisponível.');
  } else {
    if (!site.tableService.enabled || !site.tableService.orders) throw new HttpError(400, 'Pedidos pela mesa estão desativados.');
    table = findTable(site, body.table);
    if (!table) throw new HttpError(400, 'Mesa não encontrada.');
    paymentMethod = 'at_table';
  }

  const quote = quoteOrder(site, { lines: body.lines, mode, code: body.code });
  if (quote.errors.includes('unavailable')) throw new HttpError(409, 'Algum item do carrinho ficou indisponível. Revise o pedido.');
  if (!quote.lines.length) throw new HttpError(400, 'Seu carrinho está vazio.');
  if (quote.errors.includes('minOrder')) throw new HttpError(400, 'O pedido não atingiu o valor mínimo para entrega.');

  let payment = { status: 'pending' };
  if (paymentMethod === 'online') {
    assertFields(validateCard(body.payment?.card));
    const result = processTestPayment({ method: 'card', card: body.payment.card });
    if (result.status !== 'approved') throw new HttpError(402, result.reason, { fields: { number: result.reason } });
    payment = { status: 'paid', brand: result.brand, last4: result.last4 };
  }

  const inserted = await insertOrder(sql, id, site, {
    quote, table, paymentMethod, payment, address,
    customerId: customer?.id,
    name: customer?.name ?? String(body.name ?? '').trim().slice(0, 80),
    phone: customer?.phone ?? '',
    notes: String(body.notes ?? '').trim().slice(0, 300),
  });
  sendJson(res, 201, { order: orderView(inserted) });
}

/** Andamento de um pedido feito na mesa (o id é longo e aleatório, serve de "ticket"). */
export async function orderStatus({ res, sql, params }) {
  const { id } = await tenant(sql, params.slug);
  if (!UUID_RE.test(params.id)) throw new HttpError(404, 'Pedido não encontrado.');
  const [row] = await sql`select * from orders where id = ${params.id}::uuid and restaurant_id = ${id}`;
  if (!row) throw new HttpError(404, 'Pedido não encontrado.');
  sendJson(res, 200, { order: orderView(row) });
}
