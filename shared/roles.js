// Quem pode o quê no painel. O dono da conta (login em /entrar) é o gerente e pode tudo;
// os colaboradores entram pelo link que o gerente gera e veem só o que o cargo permite.

export const CAPABILITIES = {
  tables: 'Ocupar mesas e lançar pedidos',
  checkout: 'Fechar a conta das mesas',
  orders: 'Pedidos e cozinha',
  reservations: 'Reservas',
  menu: 'Pratos esgotados',
  customers: 'Clientes',
  finance: 'Dashboard financeiro',
  team: 'Colaboradores',
  site: 'Editar o site',
  settings: 'Configurações da operação',
  billing: 'Plano e assinatura',
};

const ALL = Object.keys(CAPABILITIES);

export const ROLES = {
  owner: { label: 'Gerente', description: 'Conta principal. Acesso a tudo.', caps: ALL },
  socio: {
    label: 'Sócio',
    description: 'Acesso total à operação, ao financeiro, à equipe e à edição do site. Não mexe no plano.',
    caps: ALL.filter((c) => c !== 'billing'),
  },
  garcom: {
    label: 'Garçom',
    description: 'Ocupa mesas, lança pedidos, atende chamados e fecha a conta.',
    caps: ['tables', 'checkout', 'orders', 'reservations', 'menu'],
  },
  caixa: {
    label: 'Caixa',
    description: 'Fecha a conta das mesas, acompanha pedidos e reservas.',
    caps: ['tables', 'checkout', 'orders', 'reservations', 'menu'],
  },
  cozinha: { label: 'Cozinha', description: 'Vê os pedidos, muda o andamento e marca pratos esgotados.', caps: ['orders', 'menu'] },
  recepcao: { label: 'Recepção', description: 'Recebe os clientes, ocupa mesas e cuida das reservas.', caps: ['tables', 'reservations'] },
};

/** Cargos que o gerente pode dar a um colaborador. */
export const STAFF_ROLES = ['socio', 'garcom', 'caixa', 'cozinha', 'recepcao'];

export const roleCaps = (role) => ROLES[role]?.caps ?? [];
export const can = (role, cap) => roleCaps(role).includes(cap);
export const roleLabel = (role) => ROLES[role]?.label ?? role;
