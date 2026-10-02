-- Lumenu — esquema do banco (Neon Postgres).
-- Idempotente: pode ser executado de novo sem apagar dados.

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,            -- sempre em minúsculas
  password_hash text not null,           -- bcrypt
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token_hash text primary key,           -- sha256 do token do cookie (o token em si nunca é salvo)
  account_id uuid not null references accounts(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_account_idx on sessions(account_id);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  plan text not null check (plan in ('basico', 'pro', 'ultimate')),
  status text not null check (status in ('active', 'past_due', 'canceled')),
  price_cents integer not null,
  current_period_end timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists subscriptions_account_idx on subscriptions(account_id);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete set null,
  subscription_id uuid references subscriptions(id) on delete set null,
  amount_cents integer not null,
  method text not null check (method in ('card', 'pix')),
  status text not null check (status in ('approved', 'declined')),
  card_brand text,                        -- só bandeira e 4 últimos dígitos; nunca o número
  card_last4 text,
  decline_reason text,
  created_at timestamptz not null default now()
);
create index if not exists payments_account_idx on payments(account_id);

create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references accounts(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 40),
  draft jsonb not null,                   -- o que está sendo editado no painel
  published jsonb,                        -- o que o site público mostra
  published_at timestamptz,
  domain_status text not null default 'pending' check (domain_status in ('pending', 'active', 'error', 'manual')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  content_type text not null,
  size_bytes integer not null,
  data bytea not null,
  created_at timestamptz not null default now()
);
create index if not exists media_restaurant_idx on media(restaurant_id);

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  code text not null,
  floor_id text not null,
  table_id text not null,
  table_label text not null,
  date date not null,
  time time not null,
  party_size integer not null check (party_size between 1 and 50),
  customer_name text not null,
  customer_phone text not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'canceled')),
  created_at timestamptz not null default now(),
  unique (restaurant_id, code)
);
create index if not exists reservations_lookup_idx on reservations(restaurant_id, date);

-- ---------- Rodada 2: perfil, clientes, pedidos, atendimento na mesa ----------

alter table accounts add column if not exists phone text not null default '';
alter table accounts add column if not exists avatar_url text;
alter table accounts add column if not exists company jsonb not null default '{}'::jsonb;

-- Clientes de cada restaurante (cada site tem suas próprias contas).
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null default '',
  password_hash text not null,
  created_at timestamptz not null default now(),
  unique (restaurant_id, email)
);

create table if not exists customer_sessions (
  token_hash text primary key,
  customer_id uuid not null references customers(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table reservations add column if not exists customer_id uuid references customers(id) on delete set null;
alter table reservations add column if not exists canceled_by text;
alter table reservations add column if not exists canceled_at timestamptz;
alter table reservations add column if not exists promo jsonb;
alter table reservations drop constraint if exists reservations_status_check;
alter table reservations add constraint reservations_status_check check (status in ('confirmed', 'canceled', 'attended', 'no_show'));
create index if not exists reservations_customer_idx on reservations(customer_id);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  number integer not null,
  type text not null check (type in ('delivery', 'table')),
  table_label text,
  status text not null default 'received' check (status in ('received', 'preparing', 'out_for_delivery', 'ready', 'delivered', 'canceled')),
  items jsonb not null,
  subtotal_cents integer not null,
  discount_cents integer not null default 0,
  delivery_fee_cents integer not null default 0,
  total_cents integer not null,
  coupon text,
  promo_title text,
  payment_method text not null check (payment_method in ('on_delivery', 'online', 'at_table')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid')),
  card_brand text,
  card_last4 text,
  customer_name text not null default '',
  customer_phone text not null default '',
  address jsonb,
  notes text not null default '',
  canceled_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, number)
);
create index if not exists orders_restaurant_idx on orders(restaurant_id, created_at desc);
create index if not exists orders_customer_idx on orders(customer_id);

-- "Chamar atendente" pelo celular na mesa.
create table if not exists service_calls (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_label text not null,
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index if not exists service_calls_restaurant_idx on service_calls(restaurant_id, status);

-- ---------- Rodada 3: operação do salão, equipe, financeiro e contrato anual ----------

-- Contrato anual cobrado por mês; cancelamento só no último mês e vale a partir da próxima cobrança.
alter table subscriptions add column if not exists contract_months integer not null default 12;
alter table subscriptions add column if not exists terms_accepted_at timestamptz;
alter table subscriptions add column if not exists cancel_requested_at timestamptz;
alter table subscriptions add column if not exists cancel_at timestamptz;

-- Configurações da operação ({ serviceFee: 10 }) e pratos esgotados agora (valem sem publicar o site).
alter table restaurants add column if not exists settings jsonb not null default '{}'::jsonb;
alter table restaurants add column if not exists sold_out jsonb not null default '[]'::jsonb;

-- Colaboradores: entram pelo link /equipe/<access_code> com a senha que o gerente definiu.
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  role text not null check (role in ('socio', 'garcom', 'caixa', 'cozinha', 'recepcao')),
  phone text not null default '',
  access_code text not null unique,
  password_hash text not null,
  active boolean not null default true,
  failed_logins integer not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists staff_restaurant_idx on staff(restaurant_id);

-- Uma sessão é do dono da conta (account_id) ou de um colaborador (staff_id).
alter table sessions alter column account_id drop not null;
alter table sessions add column if not exists staff_id uuid references staff(id) on delete cascade;
alter table sessions drop constraint if exists sessions_owner_check;
alter table sessions add constraint sessions_owner_check check ((account_id is null) <> (staff_id is null));
create index if not exists sessions_staff_idx on sessions(staff_id);

-- Mesa ocupada (comanda): do momento em que o grupo senta até o fechamento da conta.
create table if not exists table_sessions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_id text not null,
  table_label text not null,
  people integer not null default 0 check (people between 0 and 99),
  reservation_id uuid references reservations(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'closed')),
  opened_by text not null default '',
  opened_at timestamptz not null default now(),
  closed_by text,
  closed_at timestamptz,
  subtotal_cents integer,
  service_cents integer,
  total_cents integer,
  payment_method text check (payment_method in ('credit', 'debit', 'pix', 'cash', 'other'))
);
create unique index if not exists table_sessions_open_idx on table_sessions(restaurant_id, table_id) where status = 'open';
create index if not exists table_sessions_closed_idx on table_sessions(restaurant_id, closed_at);

alter table orders add column if not exists table_session_id uuid references table_sessions(id) on delete set null;
alter table orders add column if not exists created_by text;
create index if not exists orders_session_idx on orders(table_session_id);

-- Despesas do restaurante (aluguel, salários, fornecedores…). Recorrentes repetem todo mês até ended_on.
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  description text not null,
  category text not null,
  amount_cents integer not null check (amount_cents > 0),
  date date not null,
  recurring boolean not null default false,
  ended_on date,
  created_at timestamptz not null default now()
);
create index if not exists expenses_restaurant_idx on expenses(restaurant_id, date);
