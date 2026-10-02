// Cada restaurante publica numa "pasta" do projeto: https://<domínio do Lumenu>/<slug>
export const SLUG_MAX = 40;

// Caminhos que já são usados pelo próprio Lumenu e não podem virar nome de restaurante.
export const RESERVED_SLUGS = new Set([
  'api', 'app', 'assets', 'src', 'public', 'node_modules', 'static', 'index', 'favicon',
  'painel', 'entrar', 'assinar', 'r', 'admin', 'login', 'conta', 'mesa', 'privacidade', 'termos', 'lumenu', 'www', 'equipe',
]);

/** "Bistrô São João!" → "bistro-sao-joao" */
export function slugify(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '');
}

export const isValidSlug = (slug) =>
  typeof slug === 'string' && slug.length >= 2 && slug.length <= SLUG_MAX && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && !RESERVED_SLUGS.has(slug);

/** Endereço público completo do site de um restaurante. */
export const siteUrl = (slug, origin = typeof window !== 'undefined' ? window.location.origin : '') => `${origin}/${slug}`;

/** Endereço sem "https://", para mostrar na tela. */
export const siteLabel = (slug, host = typeof window !== 'undefined' ? window.location.host : '') => `${host}/${slug}`;
