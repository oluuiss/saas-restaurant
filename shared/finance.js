// Financeiro do restaurante: categorias de despesa e meses (AAAA-MM).

export const EXPENSE_CATEGORIES = {
  insumos: 'Fornecedores e insumos',
  salarios: 'Salários e encargos',
  aluguel: 'Aluguel e condomínio',
  contas: 'Água, luz, gás e internet',
  impostos: 'Impostos e taxas',
  maquininha: 'Taxas de cartão e apps',
  marketing: 'Marketing',
  manutencao: 'Manutenção e equipamentos',
  outros: 'Outros',
};

/** Lançada automaticamente a partir dos pagamentos do plano. */
export const LUMENU_CATEGORY = 'lumenu';
export const categoryLabel = (id) => (id === LUMENU_CATEGORY ? 'Assinatura Lumenu' : EXPENSE_CATEGORIES[id] ?? 'Outros');

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
export const monthOf = (isoDate) => String(isoDate).slice(0, 7);
export const firstDay = (ym) => `${ym}-01`;
export function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
export function lastDay(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${ym}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`;
}

/** A despesa conta neste mês? Avulsa: só no mês da data. Recorrente: do mês da data até ended_on. */
export function expenseInMonth(expense, ym) {
  const start = monthOf(expense.date);
  if (!expense.recurring) return start === ym;
  if (ym < start) return false;
  return !expense.endedOn || ym <= monthOf(expense.endedOn);
}

export const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const MONTH_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
