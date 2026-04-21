-- Vetoo: clínicas y usuarios staff (además del esquema barberapp / negocios)

create table if not exists public.clinicas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  nombre text not null,
  slug text not null unique,
  email text,
  pais text not null default 'EC',
  activa boolean not null default true,
  plan text not null default 'trial' check (plan in ('trial','basic','pro','premium','cancelled')),
  trial_expira_at timestamptz default (now() + interval '14 days'),
  plan_expira_at timestamptz,
  owner_id uuid not null unique references auth.users(id) on delete cascade
);

create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  nombre text not null,
  rol text not null default 'admin' check (rol in ('admin','veterinario','recepcion'))
);

create index if not exists idx_usuarios_clinica on public.usuarios(clinica_id);

create trigger clinicas_vetoo_updated_at
  before update on public.clinicas
  for each row execute function public.handle_updated_at();

alter table public.clinicas enable row level security;
alter table public.usuarios enable row level security;

-- Clínicas activas visibles para público (rutas /[clinica]); el dueño ve la suya siempre
create policy "clinicas_select_public_or_owner"
  on public.clinicas for select
  using (activa = true or owner_id = auth.uid());

create policy "clinicas_insert_owner"
  on public.clinicas for insert
  with check (owner_id = auth.uid());

create policy "clinicas_update_owner"
  on public.clinicas for update
  using (owner_id = auth.uid());

create policy "usuarios_select_own_clinica"
  on public.usuarios for select
  using (
    id = auth.uid()
    or clinica_id in (select id from public.clinicas where owner_id = auth.uid())
  );

create policy "usuarios_insert_own_clinica"
  on public.usuarios for insert
  with check (
    id = auth.uid()
    and clinica_id in (select id from public.clinicas where owner_id = auth.uid())
  );

create policy "usuarios_update_self"
  on public.usuarios for update
  using (id = auth.uid());
