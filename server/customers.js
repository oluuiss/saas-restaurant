import crypto from 'node:crypto';
import { HttpError, parseCookies, setCookie } from './http.js';

// Clientes de cada restaurante. O cookie vale só para /api/s/<slug>, então cada site tem a sua sessão.
const COOKIE = 'lumenu_c';
const SESSION_DAYS = 60;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const cookiePath = (slug) => `/api/s/${slug}`;

export function newCustomerSession(sql, req, res, customerId, slug) {
  const token = crypto.randomBytes(32).toString('base64url');
  return {
    query: sql`insert into customer_sessions (token_hash, customer_id, expires_at)
               values (${sha256(token)}, ${customerId}, now() + make_interval(days => ${SESSION_DAYS}))`,
    commit: () => setCookie(res, req, COOKIE, token, SESSION_DAYS * 86400, cookiePath(slug)),
  };
}

export async function currentCustomer(sql, req, restaurantId) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return null;
  const [row] = await sql`
    select c.id, c.name, c.email, c.phone
    from customer_sessions s join customers c on c.id = s.customer_id
    where s.token_hash = ${sha256(token)} and s.expires_at > now() and c.restaurant_id = ${restaurantId}`;
  return row ?? null;
}

export async function requireCustomer(sql, req, restaurantId) {
  const customer = await currentCustomer(sql, req, restaurantId);
  if (!customer) throw new HttpError(401, 'Entre na sua conta para continuar.');
  return customer;
}

export async function endCustomerSession(sql, req, res, slug) {
  const token = parseCookies(req)[COOKIE];
  if (token) await sql`delete from customer_sessions where token_hash = ${sha256(token)}`;
  setCookie(res, req, COOKIE, '', 0, cookiePath(slug));
}

/** Contagens usadas na nota do cliente (ver shared/policy.js). */
export async function customerStats(sql, customerId) {
  const [row] = await sql`
    select
      (select count(*) from reservations where customer_id = ${customerId} and status = 'attended')::int as res_ok,
      (select count(*) from reservations where customer_id = ${customerId}
         and (status = 'no_show' or (status = 'canceled' and canceled_by = 'customer')))::int as res_bad,
      (select count(*) from orders where customer_id = ${customerId} and status = 'delivered')::int as ord_ok,
      (select count(*) from orders where customer_id = ${customerId} and status = 'canceled' and canceled_by = 'customer')::int as ord_bad`;
  return { resOk: row.res_ok, resBad: row.res_bad, ordOk: row.ord_ok, ordBad: row.ord_bad };
}
