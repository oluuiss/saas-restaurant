import crypto from 'node:crypto';
import { checkPassword, currentAccount, endSession, hashPassword, newSession, requireAccount, requireMember } from '../auth.js';
import { CONTRACT_MONTHS, contractInfo } from '../../shared/contract.js';
import { EMAIL_RE, HttpError, assertFields, readJson, sendJson } from '../http.js';
import { PLANS } from '../../shared/plans.js';
import { processTestPayment, validateCard } from '../../shared/payments.js';
import { createDefaultSite } from '../../shared/site.js';
import { RESERVED_SLUGS, slugify } from '../../shared/slug.js';
import { safeImageUrl } from '../../shared/site.js';

async function uniqueSlug(sql, base) {
  let root = base.length >= 2 ? base : 'restaurante';
  if (RESERVED_SLUGS.has(root)) root = `${root}-restaurante`;
  const rows = await sql`select slug from restaurants where slug = ${root} or slug like ${`${root}-%`}`;
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(root)) return root;
  for (let n = 2; ; n++) {
    const candidate = `${root.slice(0, 36)}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Resumo da conta usado pelo painel. */
export async function accountSummary(sql, account) {
  const [restaurant] = await sql`select slug from restaurants where account_id = ${account.id}`;
  const [extra] = await sql`select phone, avatar_url, company from accounts where id = ${account.id}`;
  const [subscription] = await sql`
    select plan, status, price_cents, current_period_end from subscriptions
    where account_id = ${account.id} order by created_at desc limit 1`;
  return {
    account: { id: account.id, name: account.name, email: account.email, phone: extra?.phone ?? '', avatarUrl: extra?.avatar_url ?? null, company: extra?.company ?? {} },
    restaurant: restaurant ? { slug: restaurant.slug } : null,
    subscription: subscription
      ? { plan: subscription.plan, status: subscription.status, priceCents: subscription.price_cents, currentPeriodEnd: subscription.current_period_end }
      : null,
  };
}

/** POST /api/checkout — paga (simulado), cria conta, assinatura, restaurante e sessão. */
export async function checkout({ req, res, sql }) {
  const body = await readJson(req);
  const plan = PLANS[body.plan];
  if (!plan?.checkout) throw new HttpError(400, 'Este plano ainda não pode ser assinado online. Fale com a gente.');

  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const restaurantName = String(body.restaurantName ?? '').trim();
  const method = body.payment?.method === 'pix' ? 'pix' : 'card';

  const fields = {};
  if (name.length < 2) fields.name = 'Informe seu nome.';
  if (!EMAIL_RE.test(email) || email.length > 120) fields.email = 'Informe um e-mail válido.';
  if (password.length < 8) fields.password = 'A senha precisa ter pelo menos 8 caracteres.';
  if (password.length > 72) fields.password = 'A senha pode ter no máximo 72 caracteres.';
  if (restaurantName.length < 2 || restaurantName.length > 60) fields.restaurantName = 'Informe o nome do restaurante.';
  if (method === 'card') Object.assign(fields, validateCard(body.payment?.card));
  if (body.acceptTerms !== true) fields.terms = 'Para assinar, leia e aceite os Termos de Uso.';
  assertFields(fields);

  const [existing] = await sql`select 1 from accounts where email = ${email}`;
  if (existing) {
    throw new HttpError(409, 'Já existe uma conta com esse e-mail.', { fields: { email: 'Já existe uma conta com esse e-mail. Entre com sua senha.' } });
  }

  const payment = processTestPayment({ method, card: body.payment?.card });
  if (payment.status === 'rejected') throw new HttpError(400, payment.reason, { fields: { number: payment.reason } });
  if (payment.status === 'declined') {
    await sql`insert into payments (amount_cents, method, status, card_brand, card_last4, decline_reason)
              values (${plan.priceCents}, ${method}, 'declined', ${payment.brand}, ${payment.last4}, ${payment.reason})`;
    throw new HttpError(402, payment.reason, { fields: { number: payment.reason } });
  }

  const accountId = crypto.randomUUID();
  const subscriptionId = crypto.randomUUID();
  const slug = await uniqueSlug(sql, slugify(restaurantName));
  const passwordHash = await hashPassword(password);
  const session = newSession(sql, req, res, accountId);
  const draft = JSON.stringify(createDefaultSite(restaurantName));

  try {
    await sql.transaction([
      sql`insert into accounts (id, name, email, password_hash) values (${accountId}, ${name}, ${email}, ${passwordHash})`,
      sql`insert into subscriptions (id, account_id, plan, status, price_cents, current_period_end, contract_months, terms_accepted_at)
          values (${subscriptionId}, ${accountId}, ${plan.id}, 'active', ${plan.priceCents}, now() + interval '1 month', ${CONTRACT_MONTHS}, now())`,
      sql`insert into payments (account_id, subscription_id, amount_cents, method, status, card_brand, card_last4)
          values (${accountId}, ${subscriptionId}, ${plan.priceCents}, ${method}, 'approved', ${payment.brand ?? null}, ${payment.last4 ?? null})`,
      sql`insert into restaurants (account_id, slug, draft) values (${accountId}, ${slug}, ${draft}::jsonb)`,
      session.query,
    ]);
  } catch (error) {
    if (error.code === '23505') throw new HttpError(409, 'Já existe uma conta com esse e-mail.', { fields: { email: 'Já existe uma conta com esse e-mail.' } });
    throw error;
  }
  session.commit();

  sendJson(res, 201, {
    ok: true,
    slug,
    payment: { method, brand: payment.brand ?? null, last4: payment.last4 ?? null, amountCents: plan.priceCents },
  });
}

let dummyHash;

/** POST /api/auth/login */
export async function login({ req, res, sql }) {
  const body = await readJson(req);
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  assertFields({
    ...(EMAIL_RE.test(email) ? {} : { email: 'Informe um e-mail válido.' }),
    ...(password ? {} : { password: 'Informe sua senha.' }),
  });

  const [account] = await sql`select id, name, email, password_hash from accounts where email = ${email}`;
  // Compara mesmo sem conta para o tempo de resposta não revelar quais e-mails existem.
  dummyHash ??= await hashPassword(crypto.randomUUID());
  const ok = await checkPassword(password, account?.password_hash ?? dummyHash);
  if (!account || !ok) throw new HttpError(401, 'E-mail ou senha incorretos.');

  const session = newSession(sql, req, res, account.id);
  await session.query;
  session.commit();
  sendJson(res, 200, await accountSummary(sql, account));
}

/** POST /api/auth/logout */
export async function logout({ req, res, sql }) {
  await endSession(sql, req, res);
  sendJson(res, 200, { ok: true });
}

/** GET /api/auth/me */
export async function me({ req, res, sql }) {
  const account = await currentAccount(sql, req);
  sendJson(res, 200, account ? await accountSummary(sql, account) : { account: null });
}

const COMPANY_FIELDS = { tradeName: 80, legalName: 120, document: 20, phone: 30, address: 200, city: 80 };

/** PUT /api/account — perfil, foto e dados da empresa. */
export async function updateAccount({ req, res, sql }) {
  const account = await requireAccount(sql, req);
  const body = await readJson(req);
  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const phone = String(body.phone ?? '').trim().slice(0, 30);
  const avatarUrl = body.avatarUrl ? safeImageUrl(body.avatarUrl) : null;
  const company = Object.fromEntries(Object.entries(COMPANY_FIELDS).map(([k, max]) => [k, String(body.company?.[k] ?? '').trim().slice(0, max)]));
  assertFields({
    ...(name.length >= 2 && name.length <= 80 ? {} : { name: 'Informe seu nome.' }),
    ...(EMAIL_RE.test(email) && email.length <= 120 ? {} : { email: 'Informe um e-mail válido.' }),
  });
  if (email !== account.email) {
    const [taken] = await sql`select 1 from accounts where email = ${email} and id <> ${account.id}`;
    if (taken) throw new HttpError(409, 'Esse e-mail já está em uso.', { fields: { email: 'Esse e-mail já está em uso.' } });
  }
  await sql`update accounts set name = ${name}, email = ${email}, phone = ${phone}, avatar_url = ${avatarUrl}, company = ${JSON.stringify(company)}::jsonb
            where id = ${account.id}`;
  sendJson(res, 200, await accountSummary(sql, { id: account.id, name, email }));
}

/** PUT /api/account/password */
export async function changePassword({ req, res, sql }) {
  const account = await requireAccount(sql, req);
  const body = await readJson(req);
  const current = String(body.current ?? '');
  const next = String(body.next ?? '');
  if (next.length < 8 || next.length > 72) throw new HttpError(400, 'A nova senha precisa ter de 8 a 72 caracteres.', { fields: { next: 'Use de 8 a 72 caracteres.' } });
  const [row] = await sql`select password_hash from accounts where id = ${account.id}`;
  if (!(await checkPassword(current, row.password_hash))) throw new HttpError(400, 'A senha atual está incorreta.', { fields: { current: 'Senha atual incorreta.' } });
  await sql`update accounts set password_hash = ${await hashPassword(next)} where id = ${account.id}`;
  sendJson(res, 200, { ok: true });
}

/* ---------- Assinatura: contrato anual ---------- */

const dateBR = (d) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(d);

async function latestSubscription(sql, accountId) {
  const [sub] = await sql`
    select id, created_at, contract_months, cancel_at from subscriptions
    where account_id = ${accountId} order by created_at desc limit 1`;
  if (!sub) throw new HttpError(404, 'Assinatura não encontrada.');
  return { sub, info: contractInfo({ startedAt: sub.created_at, contractMonths: sub.contract_months, cancelAt: sub.cancel_at }) };
}

/**
 * POST /api/account/subscription/cancel — só no último mês do contrato. O plano continua ativo
 * até a data da próxima cobrança. Antes disso, o cancelamento é com a nossa equipe (multa por quebra de contrato).
 */
export async function cancelSubscription({ req, res, sql }) {
  const member = await requireMember(sql, req, 'billing');
  const { sub, info } = await latestSubscription(sql, member.restaurant.ownerId);
  if (info.cancelAt) throw new HttpError(409, `O cancelamento já está agendado para ${dateBR(info.cancelAt)}.`);
  if (!info.canCancel) {
    throw new HttpError(409, `O cancelamento sem multa fica disponível a partir de ${dateBR(info.cancelWindowStart)}, no último mês do contrato. Para cancelar antes, fale com a nossa equipe: há multa por quebra de contrato.`, { code: 'early_cancel' });
  }
  await sql`update subscriptions set cancel_at = ${info.nextBilling.toISOString()}, cancel_requested_at = now() where id = ${sub.id}`;
  sendJson(res, 200, { ok: true, cancelAt: info.nextBilling });
}

/** POST /api/account/subscription/resume — desiste do cancelamento enquanto o plano ainda está ativo. */
export async function resumeSubscription({ req, res, sql }) {
  const member = await requireMember(sql, req, 'billing');
  const { sub, info } = await latestSubscription(sql, member.restaurant.ownerId);
  if (!info.cancelAt) throw new HttpError(409, 'Não há cancelamento agendado.');
  await sql`update subscriptions set cancel_at = null, cancel_requested_at = null where id = ${sub.id}`;
  sendJson(res, 200, { ok: true });
}
