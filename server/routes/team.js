import crypto from 'node:crypto';
import { checkPassword, currentMember, endStaffSessions, hashPassword, newStaffSession, requireMember } from '../auth.js';
import { HttpError, assertFields, readJson, sendJson } from '../http.js';
import { STAFF_ROLES, roleLabel } from '../../shared/roles.js';

const UUID_RE = /^[0-9a-f-]{36}$/i;
const CODE_RE = /^[A-Za-z0-9_-]{12,40}$/;
const MAX_FAILED = 8;
const LOCK_MINUTES = 15;

/** Código do link de acesso (/equipe/<código>): 72 bits aleatórios. */
const newCode = () => crypto.randomBytes(9).toString('base64url');

function checkStaffPassword(password) {
  if (password.length < 6 || password.length > 72) return 'Use de 6 a 72 caracteres.';
  return null;
}

const brandOf = (doc) => ({ name: doc?.brand?.name ?? 'Restaurante', logo: doc?.brand?.logo ?? null });

const staffView = (s) => ({
  id: s.id, name: s.name, role: s.role, roleLabel: roleLabel(s.role), phone: s.phone, active: s.active,
  code: s.access_code, lastLoginAt: s.last_login_at, createdAt: s.created_at,
});

async function meView(sql, member) {
  const [r] = await sql`select draft, published is not null as published from restaurants where id = ${member.restaurant.id}`;
  const sub = member.subscription;
  return {
    member: {
      kind: member.kind, id: member.id, name: member.name, email: member.email, avatarUrl: member.avatarUrl,
      role: member.role, roleLabel: roleLabel(member.role), caps: member.caps,
    },
    restaurant: { slug: member.restaurant.slug, ...brandOf(r?.draft), published: Boolean(r?.published) },
    subscription: sub && { ended: sub.ended, cancelAt: sub.cancelAt },
  };
}

/** GET /api/team/me — quem está no painel (gerente ou colaborador). */
export async function me({ req, res, sql }) {
  const member = await currentMember(sql, req);
  if (!member) return sendJson(res, 200, { member: null });
  if (!member.active) return sendJson(res, 200, { member: null, inactive: true });
  sendJson(res, 200, await meView(sql, member));
}

/** GET /api/team/invite/:code — dados para a página de login do colaborador. */
export async function invite({ res, sql, params }) {
  if (!CODE_RE.test(params.code)) throw new HttpError(404, 'Link de acesso inválido.');
  const [row] = await sql`
    select s.name, s.active, r.draft from staff s join restaurants r on r.id = s.restaurant_id
    where s.access_code = ${params.code}`;
  if (!row) throw new HttpError(404, 'Este link de acesso não existe mais. Peça um novo ao gerente.');
  sendJson(res, 200, { name: row.name.split(/\s+/)[0], active: row.active, restaurant: brandOf(row.draft) });
}

let dummyHash;

/** POST /api/team/login — { code, password } */
export async function login({ req, res, sql }) {
  const body = await readJson(req);
  const code = String(body.code ?? '');
  const password = String(body.password ?? '');
  if (!password) throw new HttpError(400, 'Informe sua senha.', { fields: { password: 'Informe sua senha.' } });

  const [staff] = CODE_RE.test(code)
    ? await sql`select id, password_hash, active, failed_logins, locked_until > now() as locked,
                       ceil(extract(epoch from (locked_until - now())) / 60)::int as wait
                from staff where access_code = ${code}`
    : [];
  dummyHash ??= await hashPassword(crypto.randomUUID());
  if (!staff) {
    await checkPassword(password, dummyHash);
    throw new HttpError(404, 'Este link de acesso não existe mais. Peça um novo ao gerente.');
  }
  if (staff.locked) throw new HttpError(429, `Muitas tentativas erradas. Tente de novo em ${staff.wait} min.`);

  if (!(await checkPassword(password, staff.password_hash))) {
    const failed = staff.failed_logins + 1;
    if (failed >= MAX_FAILED) {
      await sql`update staff set failed_logins = 0, locked_until = now() + make_interval(mins => ${LOCK_MINUTES}) where id = ${staff.id}`;
      throw new HttpError(429, `Muitas tentativas erradas. O acesso fica bloqueado por ${LOCK_MINUTES} min.`);
    }
    await sql`update staff set failed_logins = ${failed} where id = ${staff.id}`;
    throw new HttpError(401, 'Senha incorreta.', { fields: { password: 'Senha incorreta.' } });
  }
  if (!staff.active) throw new HttpError(403, 'Seu acesso foi desativado. Fale com o gerente.');

  const session = newStaffSession(sql, req, res, staff.id);
  await sql.transaction([
    sql`update staff set failed_logins = 0, locked_until = null, last_login_at = now() where id = ${staff.id}`,
    session.query,
  ]);
  session.commit();
  sendJson(res, 200, { ok: true });
}

/** PUT /api/team/password — o colaborador troca a própria senha. */
export async function changeOwnPassword({ req, res, sql }) {
  const member = await requireMember(sql, req, null, { allowEnded: true });
  if (member.kind !== 'staff') throw new HttpError(400, 'Use Configurações › Senha para trocar a senha da conta principal.');
  const body = await readJson(req);
  const current = String(body.current ?? '');
  const next = String(body.next ?? '');
  const invalid = checkStaffPassword(next);
  if (invalid) throw new HttpError(400, invalid, { fields: { next: invalid } });
  const [row] = await sql`select password_hash from staff where id = ${member.id}`;
  if (!(await checkPassword(current, row.password_hash))) throw new HttpError(400, 'A senha atual está incorreta.', { fields: { current: 'Senha atual incorreta.' } });
  await sql`update staff set password_hash = ${await hashPassword(next)} where id = ${member.id}`;
  sendJson(res, 200, { ok: true });
}

/* ---------- Gestão da equipe (gerente e sócios) ---------- */

function readStaffFields(body, { requirePassword }) {
  const name = String(body.name ?? '').trim().slice(0, 60);
  const role = String(body.role ?? '');
  const phone = String(body.phone ?? '').trim().slice(0, 30);
  const password = String(body.password ?? '');
  const fields = {};
  if (name.length < 2) fields.name = 'Informe o nome do colaborador.';
  if (!STAFF_ROLES.includes(role)) fields.role = 'Escolha o cargo.';
  if (requirePassword) {
    const invalid = checkStaffPassword(password);
    if (invalid) fields.password = invalid;
  }
  assertFields(fields);
  return { name, role, phone, password };
}

async function ownStaff(sql, member, id) {
  if (!UUID_RE.test(id)) throw new HttpError(404, 'Colaborador não encontrado.');
  const [row] = await sql`select * from staff where id = ${id}::uuid and restaurant_id = ${member.restaurant.id}`;
  if (!row) throw new HttpError(404, 'Colaborador não encontrado.');
  return row;
}

const notSelf = (member, staff, message) => {
  if (member.kind === 'staff' && member.id === staff.id) throw new HttpError(400, message);
};

/** GET /api/team/staff */
export async function listStaff({ req, res, sql }) {
  const member = await requireMember(sql, req, 'team');
  const rows = await sql`select * from staff where restaurant_id = ${member.restaurant.id} order by active desc, created_at`;
  sendJson(res, 200, { staff: rows.map(staffView) });
}

/** POST /api/team/staff — { name, role, phone, password } */
export async function createStaff({ req, res, sql }) {
  const member = await requireMember(sql, req, 'team');
  const { name, role, phone, password } = readStaffFields(await readJson(req), { requirePassword: true });
  const [{ count }] = await sql`select count(*)::int as count from staff where restaurant_id = ${member.restaurant.id}`;
  if (count >= 100) throw new HttpError(400, 'Limite de 100 colaboradores atingido.');
  const [row] = await sql`
    insert into staff (restaurant_id, name, role, phone, access_code, password_hash)
    values (${member.restaurant.id}, ${name}, ${role}, ${phone}, ${newCode()}, ${await hashPassword(password)})
    returning *`;
  sendJson(res, 201, { staff: staffView(row) });
}

/** PUT /api/team/staff/:id — { name, role, phone, active } */
export async function updateStaff({ req, res, sql, params }) {
  const member = await requireMember(sql, req, 'team');
  const staff = await ownStaff(sql, member, params.id);
  const body = await readJson(req);
  const { name, role, phone } = readStaffFields(body, { requirePassword: false });
  const active = body.active !== false;
  if (!active || role !== staff.role) notSelf(member, staff, 'Você não pode mudar o próprio cargo nem desativar o próprio acesso.');
  const [row] = await sql`
    update staff set name = ${name}, role = ${role}, phone = ${phone}, active = ${active}
    where id = ${staff.id} returning *`;
  // Cargo novo ou acesso desativado valem na hora: a sessão aberta cai.
  if (!active || role !== staff.role) await endStaffSessions(sql, staff.id);
  sendJson(res, 200, { staff: staffView(row) });
}

/** POST /api/team/staff/:id/password — o gerente define uma senha nova. */
export async function resetStaffPassword({ req, res, sql, params }) {
  const member = await requireMember(sql, req, 'team');
  const staff = await ownStaff(sql, member, params.id);
  const password = String((await readJson(req)).password ?? '');
  const invalid = checkStaffPassword(password);
  if (invalid) throw new HttpError(400, invalid, { fields: { password: invalid } });
  await sql`update staff set password_hash = ${await hashPassword(password)}, failed_logins = 0, locked_until = null where id = ${staff.id}`;
  await endStaffSessions(sql, staff.id);
  sendJson(res, 200, { ok: true });
}

/** POST /api/team/staff/:id/link — gera um link novo; o antigo para de funcionar. */
export async function regenerateLink({ req, res, sql, params }) {
  const member = await requireMember(sql, req, 'team');
  const staff = await ownStaff(sql, member, params.id);
  notSelf(member, staff, 'Peça ao gerente para gerar um link novo para você.');
  const [row] = await sql`update staff set access_code = ${newCode()} where id = ${staff.id} returning *`;
  await endStaffSessions(sql, staff.id);
  sendJson(res, 200, { staff: staffView(row) });
}

/** DELETE /api/team/staff/:id */
export async function deleteStaff({ req, res, sql, params }) {
  const member = await requireMember(sql, req, 'team');
  const staff = await ownStaff(sql, member, params.id);
  notSelf(member, staff, 'Você não pode remover o próprio acesso.');
  await sql`delete from staff where id = ${staff.id}`;
  sendJson(res, 200, { ok: true });
}
