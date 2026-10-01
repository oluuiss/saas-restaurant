import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { HttpError, parseCookies, setCookie } from './http.js';

const COOKIE = 'lumenu_session';
const SESSION_DAYS = 30;

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export const hashPassword = (password) => bcrypt.hash(password, 10);
export const checkPassword = (password, hash) => bcrypt.compare(password, hash);

/**
 * Prepara uma sessão nova: devolve o comando SQL (para rodar sozinho ou dentro de uma transação)
 * e `commit`, que grava o cookie na resposta depois que o SQL der certo.
 */
export function newSession(sql, req, res, accountId) {
  const token = crypto.randomBytes(32).toString('base64url');
  return {
    query: sql`insert into sessions (token_hash, account_id, expires_at)
               values (${sha256(token)}, ${accountId}, now() + make_interval(days => ${SESSION_DAYS}))`,
    commit: () => setCookie(res, req, COOKIE, token, SESSION_DAYS * 86400),
  };
}

export async function currentAccount(sql, req) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return null;
  const rows = await sql`
    select a.id, a.name, a.email
    from sessions s join accounts a on a.id = s.account_id
    where s.token_hash = ${sha256(token)} and s.expires_at > now()`;
  return rows[0] ?? null;
}

export async function requireAccount(sql, req) {
  const account = await currentAccount(sql, req);
  if (!account) throw new HttpError(401, 'Sua sessão expirou. Entre novamente.');
  return account;
}

export async function endSession(sql, req, res) {
  const token = parseCookies(req)[COOKIE];
  if (token) await sql`delete from sessions where token_hash = ${sha256(token)}`;
  setCookie(res, req, COOKIE, '', 0);
}
