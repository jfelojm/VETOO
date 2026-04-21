-- ============================================================
-- VETOO — Schema inicial (MVP)
-- Ejecutar en: Supabase > SQL Editor > New query
-- ============================================================

create extension if not exists "uuid-ossp";

-- =========================
-- Tenancy: clínicas
-- =========================
create table if not exists public.clinicas (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  nombre text not null,
  slug text not null unique,
  email text not null,
  telefono text,
  direccion text,
  ciudad text,
  pais text not null default 'EC',
  timezone text not null default 'America/Guayaquil',

  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'trial' check (plan in ('trial','basic','pro','premium','cancelled')),
  plan_expira_at timestamptz,
  trial_expira_at timestamptz default (now() + interval '14 days'),

  activo boolean not null default true,
  owner_id uuid references auth.users(id) on delete cascade
);

-- =========================
-- Staff (veterinarios y personal)
-- =========================
create table if not exists public.staff (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),

  clinica_id uuid references public.clinicas(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,

  nombre text not null,
  email text,
  rol text not null default 'veterinario' check (rol in ('veterinario','recepcion','admin')),
  activo boolean not null default true,
  orden integer default 0
);

create index if not exists idx_staff_user_id on public.staff(user_id);

-- =========================
-- Servicios veterinarios
-- =========================
create table if not exists public.servicios (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),

  clinica_id uuid references public.clinicas(id) on delete cascade not null,
  nombre text not null,
  descripcion text,
  duracion_min integer not null default 30,
  precio numeric(10,2),
  activo boolean not null default true,
  orden integer default 0
);

-- =========================
-- Dueños (propietarios) y pacientes (mascotas)
-- =========================
create table if not exists public.duenos (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),

  clinica_id uuid references public.clinicas(id) on delete cascade not null,
  nombre text not null,
  telefono text,
  email text,

  unique(clinica_id, telefono)
);

create table if not exists public.pacientes (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),

  clinica_id uuid references public.clinicas(id) on delete cascade not null,
  dueno_id uuid references public.duenos(id) on delete cascade not null,

  nombre text not null,
  especie text,       -- perro/gato/exótico
  raza text,
  sexo text,
  fecha_nacimiento date,
  color text,
  microchip text
);

-- =========================
-- Bloqueos (agenda) y citas
-- =========================
create table if not exists public.bloqueos (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),

  clinica_id uuid references public.clinicas(id) on delete cascade not null,
  staff_id uuid references public.staff(id) on delete cascade,

  fecha_desde timestamptz not null,
  fecha_hasta timestamptz not null,
  motivo text,
  constraint bloqueo_fechas_validas check (fecha_hasta > fecha_desde)
);

create table if not exists public.citas (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  clinica_id uuid references public.clinicas(id) on delete cascade not null,
  staff_id uuid references public.staff(id) on delete set null,
  servicio_id uuid references public.servicios(id) on delete set null,
  dueno_id uuid references public.duenos(id) on delete set null,
  paciente_id uuid references public.pacientes(id) on delete set null,

  fecha_hora timestamptz not null,
  duracion_min integer not null default 30,
  fecha_hora_fin timestamptz generated always as (fecha_hora + (duracion_min * interval '1 minute')) stored,

  estado text not null default 'pendiente' check (estado in ('pendiente','confirmada','completada','cancelada','no_show')),
  motivo text,
  notas text
);

create index if not exists citas_clinica_fecha on public.citas(clinica_id, fecha_hora);
create index if not exists citas_staff_fecha on public.citas(staff_id, fecha_hora);

-- =========================
-- Triggers
-- =========================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists clinicas_updated_at on public.clinicas;
create trigger clinicas_updated_at before update on public.clinicas
  for each row execute function public.handle_updated_at();

drop trigger if exists citas_updated_at on public.citas;
create trigger citas_updated_at before update on public.citas
  for each row execute function public.handle_updated_at();

-- =========================
-- RLS (mínimo viable)
-- =========================
alter table public.clinicas enable row level security;
alter table public.staff enable row level security;
alter table public.servicios enable row level security;
alter table public.duenos enable row level security;
alter table public.pacientes enable row level security;
alter table public.bloqueos enable row level security;
alter table public.citas enable row level security;

-- Owner ve/edita su clínica
create policy "Owner ve su clinica"
  on public.clinicas for select using (owner_id = auth.uid());

create policy "Owner edita su clinica"
  on public.clinicas for update using (owner_id = auth.uid());

-- Owner gestiona todo lo de su clínica
create policy "Owner gestiona staff"
  on public.staff for all using (clinica_id in (select id from public.clinicas where owner_id = auth.uid()));

create policy "Owner gestiona servicios"
  on public.servicios for all using (clinica_id in (select id from public.clinicas where owner_id = auth.uid()));

create policy "Owner gestiona duenos"
  on public.duenos for all using (clinica_id in (select id from public.clinicas where owner_id = auth.uid()));

create policy "Owner gestiona pacientes"
  on public.pacientes for all using (clinica_id in (select id from public.clinicas where owner_id = auth.uid()));

create policy "Owner gestiona bloqueos"
  on public.bloqueos for all using (clinica_id in (select id from public.clinicas where owner_id = auth.uid()));

create policy "Owner gestiona citas"
  on public.citas for all using (clinica_id in (select id from public.clinicas where owner_id = auth.uid()));

