import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { HttpError, parseCookies, setCookie } from './http.js';
import { contractInfo } from '../shared/contract.js';
import { roleCaps } from '../shared/roles.js';

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

/* ---------- Equipe: dono da conta ou colaborador ---------- */

export function newStaffSession(sql, req, res, staffId) {
  const token = crypto.randomBytes(32).toString('base64url');
  return {
    query: sql`insert into sessions (token_hash, staff_id, expires_at)
               values (${sha256(token)}, ${staffId}, now() + make_interval(days => ${SESSION_DAYS}))`,
    commit: () => setCookie(res, req, COOKIE, token, SESSION_DAYS * 86400),
  };
}

/**
 * Quem está usando o painel: o gerente (dono da conta) ou um colaborador, com o restaurante,
 * o cargo, as permissões e a situação da assinatura.
 */
export async function currentMember(sql, req) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return null;
  const [row] = await sql`
    select s.staff_id, a.id as account_id, a.name as account_name, a.email, a.avatar_url,
           st.name as staff_name, st.role, st.active,
           r.id as restaurant_id, r.slug, r.account_id as owner_id,
           sub.created_at as sub_started, sub.contract_months, sub.cancel_at
    from sessions s
    left join accounts a on a.id = s.account_id
    left join staff st on st.id = s.staff_id
    join restaurants r on r.id = st.restaurant_id or r.account_id = a.id
    left join lateral (
      select created_at, contract_months, cancel_at from subscriptions
      where account_id = r.account_id order by created_at desc limit 1
    ) sub on true
    where s.token_hash = ${sha256(token)} and s.expires_at > now()`;
  if (!row) return null;
  const owner = !row.staff_id;
  const role = owner ? 'owner' : row.role;
  return {
    kind: owner ? 'owner' : 'staff',
    id: owner ? row.account_id : row.staff_id,
    name: owner ? row.account_name : row.staff_name,
    email: owner ? row.email : null,
    avatarUrl: owner ? row.avatar_url : null,
    role,
    caps: roleCaps(role),
    active: owner || row.active,
    restaurant: { id: row.restaurant_id, slug: row.slug, ownerId: row.owner_id },
    subscription: row.sub_started
      ? contractInfo({ startedAt: row.sub_started, contractMonths: row.contract_months, cancelAt: row.cancel_at })
      : null,
  };
}

/**
 * Exige alguém da equipe com a permissão `cap` (ou uma delas, se for lista; ver shared/roles.js).
 * Com a assinatura encerrada, só passa o que for marcado com `allowEnded`.
 */
export async function requireMember(sql, req, cap = null, { allowEnded = false } = {}) {
  const member = await currentMember(sql, req);
  if (!member) throw new HttpError(401, 'Sua sessão expirou. Entre novamente.');
  if (!member.active) throw new HttpError(403, 'Seu acesso foi desativado pelo gerente.', { code: 'inactive' });
  if (member.subscription?.ended && !allowEnded) {
    throw new HttpError(402, 'A assinatura deste restaurante foi encerrada.', { code: 'subscription_ended' });
  }
  const caps = Array.isArray(cap) ? cap : cap ? [cap] : [];
  if (caps.length && !caps.some((c) => member.caps.includes(c))) {
    throw new HttpError(403, 'Seu cargo não tem acesso a esta área.', { code: 'forbidden' });
  }
  return member;
}

/** Derruba as sessões de um colaborador (senha trocada, link novo, acesso desativado). */
export const endStaffSessions = (sql, staffId) => sql`delete from sessions where staff_id = ${staffId}`;
