// Planos do Lumenu. `checkout: true` = já pode ser assinado online.
export const PLANS = {
  basico: {
    id: 'basico',
    name: 'Básico',
    priceCents: 5990,
    tagline: 'Para quem vende por delivery',
    features: { delivery: true, reservations: false, email: true, promotions: true },
    checkout: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceCents: 9990,
    tagline: 'Para quem recebe no salão',
    features: { delivery: false, reservations: true, email: true, promotions: true },
    checkout: false,
  },
  ultimate: {
    id: 'ultimate',
    name: 'Ultimate',
    priceCents: 14990,
    tagline: 'Delivery + salão',
    features: { delivery: true, reservations: true, email: true, promotions: true },
    checkout: true,
  },
};

export const FEATURE_LABELS = {
  delivery: 'Delivery',
  reservations: 'Reserva de mesa',
  email: 'Disparo de email',
  promotions: 'Promoções',
};

export const formatBRL = (cents) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
