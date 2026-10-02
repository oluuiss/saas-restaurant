import { requireMember } from '../auth.js';
import { HttpError, readBody, sendJson } from '../http.js';

const MAX_BYTES = 3_000_000;            // por imagem (o painel já reduz antes de enviar)
const QUOTA_BYTES = 80_000_000;         // por restaurante

// Só imagens rasterizadas: SVG pode carregar scripts e por isso não é aceito.
const SIGNATURES = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
};

/** POST /api/media — corpo binário da imagem, Content-Type image/jpeg|png|webp. */
export async function uploadMedia({ req, res, sql }) {
  // Fotos do site e foto de perfil: quem edita o site ou o próprio gerente.
  const member = await requireMember(sql, req, ['site', 'billing']);
  const restaurant = member.restaurant;

  const contentType = String(req.headers['content-type'] ?? '').split(';')[0].trim();
  if (!SIGNATURES[contentType]) throw new HttpError(415, 'Envie uma imagem JPG, PNG ou WebP.');
  const data = await readBody(req, MAX_BYTES);
  if (!data.length || !SIGNATURES[contentType](data)) throw new HttpError(415, 'O arquivo não parece ser uma imagem válida.');

  const [{ used }] = await sql`select coalesce(sum(size_bytes), 0)::bigint as used from media where restaurant_id = ${restaurant.id}`;
  if (Number(used) + data.length > QUOTA_BYTES) throw new HttpError(413, 'Limite de armazenamento de fotos atingido.');

  const [row] = await sql`
    insert into media (restaurant_id, content_type, size_bytes, data)
    values (${restaurant.id}, ${contentType}, ${data.length}, decode(${data.toString('base64')}, 'base64'))
    returning id`;
  sendJson(res, 201, { id: row.id, url: `/api/media/${row.id}` });
}

/** GET /api/media/:id — imagens são imutáveis (um id por upload), então podem ficar em cache. */
export async function getMedia({ res, sql, params }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) throw new HttpError(404, 'Imagem não encontrada.');
  const [row] = await sql`select content_type, encode(data, 'base64') as b64 from media where id = ${params.id}::uuid`;
  if (!row) throw new HttpError(404, 'Imagem não encontrada.');
  const body = Buffer.from(row.b64, 'base64');
  res.statusCode = 200;
  res.setHeader('Content-Type', row.content_type);
  res.setHeader('Content-Length', body.length);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  res.end(body);
}
