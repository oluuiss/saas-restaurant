import { requireMember } from '../auth.js';
import { HttpError, assertFields, readJson, sendJson } from '../http.js';
import { EXPENSE_CATEGORIES, LUMENU_CATEGORY, MONTH_RE, expenseInMonth, firstDay, lastDay, monthOf, shiftMonth } from '../../shared/finance.js';
import { tr } from '../../shared/i18n.js';
import { nowInTimezone } from '../../shared/site.js';

// Dashboard financeiro. Receita = contas fechadas no salão (sem a taxa de serviço, que é da equipe)
// + pedidos de delivery entregues. Lucro líquido = receita − despesas (as lançadas + a assinatura do Lumenu).

const UUID_RE = /^[0-9a-f-]{36}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TZ = 'America/Sao_Paulo';

const expenseView = (e) => ({
  id: e.id, description: e.description, category: e.category, amount: e.amount_cents, date: e.date,
  recurring: e.recurring, endedOn: e.ended_on,
});

async function restaurantExpenses(sql, restaurantId, from, to) {
  const rows = await sql`
    select id, description, category, amount_cents, to_char(date, 'YYYY-MM-DD') as date, recurring,
           to_char(ended_on, 'YYYY-MM-DD') as ended_on
    from expenses
    where restaurant_id = ${restaurantId} and date <= ${to}::date
      and (date >= ${from}::date or (recurring and (ended_on is null or ended_on >= ${from}::date)))
    order by date, created_at`;
  return rows.map(expenseView);
}

/** GET /api/finance/summary?month=AAAA-MM — o mês escolhido em detalhe e os 12 meses do ano. */
export async function summary({ req, res, sql, query }) {
  const member = await requireMember(sql, req, 'finance');
  const rid = member.restaurant.id;
  const month = MONTH_RE.test(query.get('month') ?? '') ? query.get('month') : monthOf(nowInTimezone().date);
  const year = month.slice(0, 4);
  // Série de dezembro do ano anterior até dezembro (para comparar janeiro com o mês anterior).
  const seriesFrom = firstDay(shiftMonth(`${year}-01`, -1));
  const seriesTo = lastDay(`${year}-12`);
  const monthFrom = firstDay(month);
  const monthTo = lastDay(month);

  const [hall, delivery, lumenu, expenses, daily, top, hours, reservations, canceled] = await Promise.all([
    sql`
      select to_char(closed_at at time zone ${TZ}, 'YYYY-MM') as ym, sum(subtotal_cents)::int as revenue, sum(service_cents)::int as service,
             count(*)::int as tables, sum(people)::int as people
      from table_sessions
      where restaurant_id = ${rid} and status = 'closed' and (closed_at at time zone ${TZ})::date between ${seriesFrom}::date and ${seriesTo}::date
      group by 1`,
    sql`
      select to_char(created_at at time zone ${TZ}, 'YYYY-MM') as ym, sum(total_cents)::int as revenue, sum(delivery_fee_cents)::int as fees, count(*)::int as orders
      from orders
      where restaurant_id = ${rid} and type = 'delivery' and status = 'delivered'
        and (created_at at time zone ${TZ})::date between ${seriesFrom}::date and ${seriesTo}::date
      group by 1`,
    sql`
      select to_char(created_at at time zone ${TZ}, 'YYYY-MM') as ym, sum(amount_cents)::int as amount
      from payments
      where account_id = ${member.restaurant.ownerId} and status = 'approved'
        and (created_at at time zone ${TZ})::date between ${seriesFrom}::date and ${seriesTo}::date
      group by 1`,
    restaurantExpenses(sql, rid, seriesFrom, seriesTo),
    sql`
      select day, sum(revenue)::int as revenue from (
        select extract(day from closed_at at time zone ${TZ})::int as day, subtotal_cents as revenue from table_sessions
        where restaurant_id = ${rid} and status = 'closed' and (closed_at at time zone ${TZ})::date between ${monthFrom}::date and ${monthTo}::date
        union all
        select extract(day from created_at at time zone ${TZ})::int, total_cents from orders
        where restaurant_id = ${rid} and type = 'delivery' and status = 'delivered'
          and (created_at at time zone ${TZ})::date between ${monthFrom}::date and ${monthTo}::date
      ) t group by day order by day`,
    sql`
      select i->>'itemId' as item_id, (array_agg(i->'name' order by o.created_at desc))[1] as name,
             sum((i->>'qty')::int)::int as qty, sum((i->>'total')::int)::int as total
      from orders o, jsonb_array_elements(o.items) i
      where o.restaurant_id = ${rid} and o.status = 'delivered'
        and (o.created_at at time zone ${TZ})::date between ${monthFrom}::date and ${monthTo}::date
      group by 1 order by qty desc, total desc limit 8`,
    sql`
      select extract(hour from created_at at time zone ${TZ})::int as hour, count(*)::int as orders
      from orders
      where restaurant_id = ${rid} and status <> 'canceled' and (created_at at time zone ${TZ})::date between ${monthFrom}::date and ${monthTo}::date
      group by 1 order by 1`,
    sql`
      select status, count(*)::int as count, sum(party_size)::int as people
      from reservations where restaurant_id = ${rid} and date between ${monthFrom}::date and ${monthTo}::date
      group by status`,
    sql`
      select count(*)::int as count, coalesce(sum(total_cents), 0)::int as total
      from orders where restaurant_id = ${rid} and status = 'canceled'
        and (created_at at time zone ${TZ})::date between ${monthFrom}::date and ${monthTo}::date`,
  ]);

  const byMonth = (rows) => new Map(rows.map((r) => [r.ym, r]));
  const hallM = byMonth(hall);
  const deliveryM = byMonth(delivery);
  const lumenuM = byMonth(lumenu);

  const monthFigures = (ym) => {
    const h = hallM.get(ym) ?? {};
    const d = deliveryM.get(ym) ?? {};
    const applied = expenses.filter((e) => expenseInMonth(e, ym));
    const byCategory = {};
    for (const e of applied) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
    const subscription = lumenuM.get(ym)?.amount ?? 0;
    if (subscription) byCategory[LUMENU_CATEGORY] = subscription;
    const hallRevenue = h.revenue ?? 0;
    const deliveryRevenue = d.revenue ?? 0;
    const revenue = hallRevenue + deliveryRevenue;
    const expenseTotal = Object.values(byCategory).reduce((a, b) => a + b, 0);
    return {
      month: ym, revenue, hallRevenue, deliveryRevenue, expenses: expenseTotal, profit: revenue - expenseTotal,
      service: h.service ?? 0, tables: h.tables ?? 0, people: h.people ?? 0, deliveryOrders: d.orders ?? 0, deliveryFees: d.fees ?? 0, byCategory,
    };
  };

  const months = Array.from({ length: 12 }, (_, i) => monthFigures(`${year}-${String(i + 1).padStart(2, '0')}`));
  const current = monthFigures(month);
  const previous = monthFigures(shiftMonth(month, -1));
  const yearTotals = months.reduce(
    (t, m) => ({ revenue: t.revenue + m.revenue, expenses: t.expenses + m.expenses, profit: t.profit + m.profit }),
    { revenue: 0, expenses: 0, profit: 0 },
  );
  const resByStatus = Object.fromEntries(reservations.map((r) => [r.status, r]));
  const lang = 'pt';

  sendJson(res, 200, {
    month,
    current,
    previous,
    months,
    year: { year: Number(year), ...yearTotals },
    daily: daily.map((d) => ({ day: d.day, revenue: d.revenue })),
    topItems: top.map((t) => ({ itemId: t.item_id, name: tr(t.name, lang), qty: t.qty, total: t.total })),
    hours: hours.map((h) => ({ hour: h.hour, orders: h.orders })),
    tickets: {
      hall: current.tables ? Math.round(current.hallRevenue / current.tables) : 0,
      perPerson: current.people ? Math.round(current.hallRevenue / current.people) : 0,
      delivery: current.deliveryOrders ? Math.round(current.deliveryRevenue / current.deliveryOrders) : 0,
    },
    reservations: {
      total: reservations.reduce((s, r) => s + r.count, 0),
      attended: resByStatus.attended?.count ?? 0,
      noShow: resByStatus.no_show?.count ?? 0,
      canceled: resByStatus.canceled?.count ?? 0,
      confirmed: resByStatus.confirmed?.count ?? 0,
      people: resByStatus.attended?.people ?? 0,
    },
    canceledOrders: canceled[0],
  });
}

/* ---------- Despesas ---------- */

/** GET /api/finance/expenses?month=AAAA-MM — as despesas que contam no mês (avulsas e recorrentes). */
export async function listExpenses({ req, res, sql, query }) {
  const member = await requireMember(sql, req, 'finance');
  const month = MONTH_RE.test(query.get('month') ?? '') ? query.get('month') : monthOf(nowInTimezone().date);
  const rows = await restaurantExpenses(sql, member.restaurant.id, firstDay(month), lastDay(month));
  sendJson(res, 200, { month, expenses: rows.filter((e) => expenseInMonth(e, month)) });
}

function readExpense(body) {
  const description = String(body.description ?? '').trim().slice(0, 120);
  const category = String(body.category ?? '');
  const amount = Math.round(Number(body.amount));
  const date = String(body.date ?? '');
  const fields = {};
  if (description.length < 2) fields.description = 'Descreva a despesa.';
  if (!EXPENSE_CATEGORIES[category]) fields.category = 'Escolha a categoria.';
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_00) fields.amount = 'Informe o valor.';
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(date))) fields.date = 'Informe a data.';
  assertFields(fields);
  return { description, category, amount, date, recurring: Boolean(body.recurring) };
}

async function ownExpense(sql, restaurantId, id) {
  if (!UUID_RE.test(id)) throw new HttpError(404, 'Despesa não encontrada.');
  const [row] = await sql`select id, to_char(date, 'YYYY-MM-DD') as date from expenses where id = ${id}::uuid and restaurant_id = ${restaurantId}`;
  if (!row) throw new HttpError(404, 'Despesa não encontrada.');
  return row;
}

/** POST /api/finance/expenses */
export async function createExpense({ req, res, sql }) {
  const member = await requireMember(sql, req, 'finance');
  const e = readExpense(await readJson(req));
  const [row] = await sql`
    insert into expenses (restaurant_id, description, category, amount_cents, date, recurring)
    values (${member.restaurant.id}, ${e.description}, ${e.category}, ${e.amount}, ${e.date}::date, ${e.recurring})
    returning id, description, category, amount_cents, to_char(date, 'YYYY-MM-DD') as date, recurring, to_char(ended_on, 'YYYY-MM-DD') as ended_on`;
  sendJson(res, 201, { expense: expenseView(row) });
}

/** PUT /api/finance/expenses/:id */
export async function updateExpense({ req, res, sql, params }) {
  const member = await requireMember(sql, req, 'finance');
  const current = await ownExpense(sql, member.restaurant.id, params.id);
  const e = readExpense(await readJson(req));
  const [row] = await sql`
    update expenses set description = ${e.description}, category = ${e.category}, amount_cents = ${e.amount}, date = ${e.date}::date,
                        recurring = ${e.recurring}, ended_on = case when ${e.recurring} then ended_on else null end
    where id = ${current.id}
    returning id, description, category, amount_cents, to_char(date, 'YYYY-MM-DD') as date, recurring, to_char(ended_on, 'YYYY-MM-DD') as ended_on`;
  sendJson(res, 200, { expense: expenseView(row) });
}

/** POST /api/finance/expenses/:id/stop — { month } a despesa recorrente deixa de contar a partir desse mês. */
export async function stopExpense({ req, res, sql, params }) {
  const member = await requireMember(sql, req, 'finance');
  const current = await ownExpense(sql, member.restaurant.id, params.id);
  const { month } = await readJson(req);
  if (!MONTH_RE.test(month ?? '')) throw new HttpError(400, 'Mês inválido.');
  if (month <= monthOf(current.date)) {
    await sql`delete from expenses where id = ${current.id}`;
  } else {
    await sql`update expenses set ended_on = ${lastDay(shiftMonth(month, -1))}::date where id = ${current.id}`;
  }
  sendJson(res, 200, { ok: true });
}

/** DELETE /api/finance/expenses/:id */
export async function deleteExpense({ req, res, sql, params }) {
  const member = await requireMember(sql, req, 'finance');
  const current = await ownExpense(sql, member.restaurant.id, params.id);
  await sql`delete from expenses where id = ${current.id}`;
  sendJson(res, 200, { ok: true });
}
