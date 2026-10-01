import { createContext, useContext } from 'react';

/**
 * Estado compartilhado do painel: rascunho do site, idioma de edição, painel aberto,
 * seleção na planta e ações (salvar, publicar, avisos).
 */
export const AdminContext = createContext(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin precisa estar dentro do painel');
  return ctx;
}
