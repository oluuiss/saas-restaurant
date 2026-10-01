// Regras de cancelamento e nota do cliente (0 a 5).

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
export const CANCEL_LEAD = 2 * HOUR;      // cancela até 2h antes
export const LATE_WINDOW = 30 * MINUTE;   // reserva feita em cima da hora: 30 min para desistir

/** Horário da reserva em ms (restaurantes no fuso de Brasília, sem horário de verão). */
export const eventTime = (date, time) => Date.parse(`${date}T${time}:00-03:00`);

/**
 * Até quando o cliente pode cancelar:
 *  - reservou com 2h ou mais de antecedência → até 2h antes do horário;
 *  - reservou em cima da hora → até 30 min depois de reservar, mas nunca nos últimos 30 min antes do horário
 *    (ex.: reservou 22:35 para 23:00 → não pode cancelar).
 */
export function cancelDeadline({ date, time, createdAt }) {
  const event = eventTime(date, time);
  const created = new Date(createdAt).getTime();
  if (event - created >= CANCEL_LEAD) return event - CANCEL_LEAD;
  return Math.min(created + LATE_WINDOW, event - LATE_WINDOW);
}

export const canCustomerCancel = (reservation, now = Date.now()) =>
  reservation.status === 'confirmed' && now <= cancelDeadline(reservation);

/**
 * Nota de 0 a 5. Calculada separadamente para reservas e pedidos e depois tirada a média.
 * Em cada uma: 5 − (cancelamentos e faltas ÷ vezes em que compareceu/recebeu).
 * Sem histórico, o cliente começa com 5.
 */
export function computeScore({ resOk = 0, resBad = 0, ordOk = 0, ordBad = 0 }) {
  const part = (ok, bad) => (ok + bad > 0 ? Math.max(0, Math.min(5, 5 - bad / Math.max(1, ok))) : null);
  const parts = [part(Number(resOk), Number(resBad)), part(Number(ordOk), Number(ordBad))].filter((v) => v !== null);
  if (!parts.length) return 5;
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) / 10;
}
