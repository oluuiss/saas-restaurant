// Gateway de pagamento de exemplo ("Lumenu Pay", modo de teste).
// Nenhuma cobrança real acontece: só os cartões de teste abaixo são aceitos.

export const TEST_CARDS = [
  { number: '4242 4242 4242 4242', result: 'approved', label: 'Aprovado' },
  { number: '5555 5555 5555 4444', result: 'approved', label: 'Aprovado' },
  { number: '4000 0000 0000 0002', result: 'declined', label: 'Recusado', reason: 'Pagamento recusado pelo banco emissor. Tente outro cartão.' },
  { number: '4000 0000 0000 9995', result: 'declined', label: 'Saldo insuficiente', reason: 'Saldo ou limite insuficiente. Tente outro cartão.' },
];

export const digitsOnly = (value) => String(value ?? '').replace(/\D/g, '');

export function cardBrand(number) {
  const n = digitsOnly(number);
  if (/^(4011|4312|4389|4514|4573|4576|5041|5066|5067|509\d|6277|6362|6363|650\d|6516|6550)/.test(n)) return 'elo';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^4/.test(n)) return 'visa';
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n)) return 'mastercard';
  return null;
}

export const BRAND_NAMES = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express', elo: 'Elo' };

export function luhnValid(number) {
  const n = digitsOnly(number);
  if (n.length < 13 || n.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < n.length; i++) {
    let d = Number(n[n.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** "MM/AA" ainda válido? */
export function expiryValid(expiry, now = new Date()) {
  const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(String(expiry ?? '').trim());
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

/** Valida os campos do cartão. Retorna { fields } com mensagens por campo (vazio = ok). */
export function validateCard(card) {
  const fields = {};
  const number = digitsOnly(card?.number);
  if (!luhnValid(number)) fields.number = 'Número de cartão inválido.';
  if (!expiryValid(card?.expiry)) fields.expiry = 'Validade inválida.';
  const cvc = digitsOnly(card?.cvc);
  if (cvc.length < 3 || cvc.length > 4) fields.cvc = 'CVV inválido.';
  if (String(card?.holder ?? '').trim().length < 3) fields.holder = 'Informe o nome impresso no cartão.';
  return fields;
}

/** Processa o pagamento simulado. */
export function processTestPayment(payment) {
  if (payment?.method === 'pix') return { status: 'approved', method: 'pix' };
  const number = digitsOnly(payment?.card?.number);
  const test = TEST_CARDS.find((c) => digitsOnly(c.number) === number);
  const base = { method: 'card', brand: cardBrand(number), last4: number.slice(-4) };
  if (!test) return { ...base, status: 'rejected', reason: 'Ambiente de teste: use um dos cartões de teste listados.' };
  return test.result === 'approved' ? { ...base, status: 'approved' } : { ...base, status: 'declined', reason: test.reason };
}
