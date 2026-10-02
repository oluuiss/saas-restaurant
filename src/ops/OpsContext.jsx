import { createContext, useContext } from 'react';

/**
 * Estado do painel de operação: quem está usando (gerente ou colaborador, com as permissões do cargo),
 * o restaurante, as mesas e o cardápio (ops/context) e os avisos.
 */
export const OpsContext = createContext(null);

export function useOps() {
  const ctx = useContext(OpsContext);
  if (!ctx) throw new Error('useOps precisa estar dentro do painel');
  return ctx;
}

/** Último link de colaborador usado neste aparelho (para voltar a ele ao sair). */
export const STAFF_CODE_KEY = 'lumenu.staffCode';

export const BRL = (cents) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents ?? 0) / 100);

/** R$ compacto para eixos e números grandes: R$ 12,9 mil. */
export const BRLshort = (cents) => {
  const v = (cents ?? 0) / 100;
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
};

export function ago(value) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `há ${hours}h${String(minutes % 60).padStart(2, '0')}`;
}

/** Duração desde a abertura da mesa: "1h05". */
export function since(value) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`;
}

export const dateBR = (value, opts = { day: '2-digit', month: '2-digit', year: 'numeric' }) =>
  value ? new Intl.DateTimeFormat('pt-BR', { ...opts, timeZone: 'America/Sao_Paulo' }).format(new Date(value)) : '';

export const initials = (name = '') => name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
