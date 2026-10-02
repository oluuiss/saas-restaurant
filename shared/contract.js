// Contrato do plano: anual (12 meses), cobrado todo mês no dia da assinatura.
// O cancelamento sem multa só pode ser pedido no último mês do contrato; o plano continua
// ativo até a data da próxima cobrança. Sem cancelamento, o contrato renova por mais 12 meses.

export const CONTRACT_MONTHS = 12;
const DAY = 86_400_000;

/** Soma meses mantendo o dia da assinatura (31/jan + 1 mês = 28 ou 29/fev). */
export function addMonths(value, months, anchorDay = new Date(value).getUTCDate()) {
  const d = new Date(value);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(anchorDay, lastDay));
  return target;
}

/**
 * Situação do contrato numa data.
 * @param {{ startedAt: string|Date, contractMonths?: number, cancelAt?: string|Date|null }} sub
 */
export function contractInfo({ startedAt, contractMonths = CONTRACT_MONTHS, cancelAt = null }, now = new Date()) {
  const start = new Date(startedAt);
  const anchor = start.getUTCDate();
  const at = new Date(now).getTime();

  // Mensalidades já vencidas (a primeira é paga na assinatura).
  let paid = 1;
  while (addMonths(start, paid, anchor).getTime() <= at) paid++;
  const nextBilling = addMonths(start, paid, anchor);

  const term = Math.ceil(paid / contractMonths); // 1º contrato, 2º (renovado)…
  const contractStart = addMonths(start, (term - 1) * contractMonths, anchor);
  const contractEnd = addMonths(start, term * contractMonths, anchor);
  const cancelWindowStart = addMonths(start, term * contractMonths - 1, anchor);
  const monthInContract = paid - (term - 1) * contractMonths;

  const cancelDate = cancelAt ? new Date(cancelAt) : null;
  const ended = Boolean(cancelDate && cancelDate.getTime() <= at);
  return {
    contractMonths,
    contractStart,
    contractEnd,
    monthInContract,
    nextBilling,
    cancelWindowStart,
    canCancel: !cancelDate && at >= cancelWindowStart.getTime(),
    cancelAt: cancelDate,
    ended,
    daysToCancelWindow: Math.max(0, Math.ceil((cancelWindowStart.getTime() - at) / DAY)),
  };
}
