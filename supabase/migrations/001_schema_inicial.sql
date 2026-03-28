-- ============================================================
-- BARBERAPP — Schema completo de base de datos
-- Ejecutar en: Supabase > SQL Editor > New query
-- ============================================================

-- Habilitar extensiones necesarias
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLA: negocios
-- Cada barbería/peluquería que se suscribe a la plataforma
-- ============================================================
create table public.negocios (
  id            uuid primary key default uuid_generate_v4(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Datos del negocio
  nombre        text not null,
  slug          text not null unique,  -- URL pública: /reservar/el-fader
  descripcion   text,
  telefono      text,
  email         text not null,
  direccion     text,
  ciudad        text,
  pais          text default 'EC',

  -- Imagen y redes
  logo_url      text,
  instagram_url text,
  whatsapp      text,

  -- Horario general (JSON con días y horas)
  -- Ej: {"lunes": {"abierto": true, "desde": "08:00", "hasta": "18:00"}, ...}
  horario       jsonb default '{}'::jsonb,

  -- Configuración de reservas
  duracion_turno_min  integer not null default 30,  -- minutos por turno
  anticipacion_min    integer not null default 60,  -- con cuántos min de anticipación se puede reservar
  max_dias_adelanto   integer not null default 30,  -- cuántos días hacia adelante se puede reservar

  -- Política de cancelación
  cancelacion_permitida       boolean not null default true,
  cancelacion_horas_minimo    integer not null default 2,   -- horas mínimas para cancelar
  cancelacion_max_por_mes     integer not null default 3,   -- máx cancelaciones antes de bloquear
  cancelacion_mensaje         text default 'Puedes cancelar tu reserva con al menos 2 horas de anticipación.',

  -- Suscripción (gestionada por Stripe)
  stripe_customer_id          text unique,
  stripe_subscription_id      text unique,
  plan                        text not null default 'trial' check (plan in ('trial','basic','pro','premium','cancelled')),
  plan_expira_at              timestamptz,
  trial_expira_at             timestamptz default (now() + interval '14 days'),

  -- Estado
  activo        boolean not null default true,
  owner_id      uuid references auth.users(id) on delete cascade not null
);

-- ============================================================
-- TABLA: barberos
-- Los profesionales que trabajan en un negocio
-- ============================================================
create table public.barberos (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz not null default now(),
  negocio_id  uuid references public.negocios(id) on delete cascade not null,
  nombre      text not null,
  foto_url    text,
  bio         text,
  activo      boolean not null default true,
  orden       integer default 0  -- para mostrarlos en orden
);

-- ============================================================
-- TABLA: servicios
-- Los servicios que ofrece cada negocio (corte, barba, etc.)
-- ============================================================
create table public.servicios (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz not null default now(),
  negocio_id  uuid references public.negocios(id) on delete cascade not null,
  nombre      text not null,           -- "Corte clásico"
  descripcion text,
  duracion    integer not null default 30,  -- minutos
  precio      numeric(8,2),            -- precio referencial (pago en local)
  activo      boolean not null default true,
  orden       integer default 0
);

-- ============================================================
-- TABLA: bloqueos
-- Horas/días bloqueados por el barbero (vacaciones, descansos)
-- ============================================================
create table public.bloqueos (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz not null default now(),
  negocio_id  uuid references public.negocios(id) on delete cascade not null,
  barbero_id  uuid references public.barberos(id) on delete cascade,  -- null = todo el negocio
  fecha_desde timestamptz not null,
  fecha_hasta timestamptz not null,
  motivo      text,  -- "Vacaciones", "Feriado", etc.
  constraint bloqueo_fechas_validas check (fecha_hasta > fecha_desde)
);

-- ============================================================
-- TABLA: clientes
-- Perfil público de los clientes (no requieren cuenta)
-- ============================================================
create table public.clientes (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz not null default now(),
  negocio_id  uuid references public.negocios(id) on delete cascade not null,

  -- Datos básicos (se piden al reservar)
  nombre      text not null,
  telefono    text not null,
  email       text,

  -- Control de cancelaciones
  cancelaciones_mes   integer not null default 0,
  bloqueado           boolean not null default false,
  bloqueado_motivo    text,

  -- Para identificar al cliente en futuras reservas
  unique(negocio_id, telefono)
);

-- ============================================================
-- TABLA: reservas
-- El corazón del sistema
-- ============================================================
create table public.reservas (
  id            uuid primary key default uuid_generate_v4(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  negocio_id    uuid references public.negocios(id) on delete cascade not null,
  barbero_id    uuid references public.barberos(id) on delete set null,
  servicio_id   uuid references public.servicios(id) on delete set null,
  cliente_id    uuid references public.clientes(id) on delete cascade not null,

  -- Horario
  fecha_hora    timestamptz not null,        -- inicio del turno
  duracion      integer not null default 30, -- minutos
  fecha_hora_fin timestamptz generated always as (fecha_hora + (duracion * interval '1 minute')) stored,

  -- Estado
  estado        text not null default 'pendiente' check (
                  estado in ('pendiente','confirmada','completada','cancelada','no_show')
                ),
  cancelada_por text check (cancelada_por in ('cliente','negocio', null)),
  cancelada_at  timestamptz,
  notas_cliente text,
  notas_interno text,  -- solo ve el barbero

  -- Política aceptada al reservar
  politica_aceptada     boolean not null default false,
  politica_texto_snapshot text  -- guardamos el texto exacto que aceptó
);

-- Índices para consultas frecuentes
create index reservas_negocio_fecha on public.reservas(negocio_id, fecha_hora);
create index reservas_barbero_fecha  on public.reservas(barbero_id, fecha_hora);
create index reservas_estado         on public.reservas(estado);

-- ============================================================
-- TABLA: notificaciones_log
-- Registro de todos los emails/SMS enviados
-- ============================================================
create table public.notificaciones_log (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz not null default now(),
  reserva_id  uuid references public.reservas(id) on delete cascade,
  tipo        text not null,  -- 'confirmacion', 'recordatorio', 'cancelacion'
  canal       text not null,  -- 'email', 'sms', 'whatsapp'
  destinatario text not null,
  estado      text not null default 'enviado',  -- 'enviado', 'error'
  error_msg   text
);

-- ============================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================

-- Actualizar updated_at automáticamente
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger negocios_updated_at before update on public.negocios
  for each row execute function public.handle_updated_at();

create trigger reservas_updated_at before update on public.reservas
  for each row execute function public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Seguridad: cada negocio solo ve sus propios datos
-- ============================================================

alter table public.negocios    enable row level security;
alter table public.barberos    enable row level security;
alter table public.servicios   enable row level security;
alter table public.bloqueos    enable row level security;
alter table public.clientes    enable row level security;
alter table public.reservas    enable row level security;
alter table public.notificaciones_log enable row level security;

-- Negocios: el owner puede ver/editar el suyo
create policy "Owner puede ver su negocio"
  on public.negocios for select using (owner_id = auth.uid());

create policy "Owner puede editar su negocio"
  on public.negocios for update using (owner_id = auth.uid());

-- Negocios: público puede ver negocios activos (para la página de reservas)
create policy "Público puede ver negocios activos"
  on public.negocios for select using (activo = true);

-- Barberos: owner gestiona, público puede ver los activos
create policy "Owner gestiona barberos"
  on public.barberos for all using (
    negocio_id in (select id from public.negocios where owner_id = auth.uid())
  );
create policy "Público ve barberos activos"
  on public.barberos for select using (activo = true);

-- Servicios: igual que barberos
create policy "Owner gestiona servicios"
  on public.servicios for all using (
    negocio_id in (select id from public.negocios where owner_id = auth.uid())
  );
create policy "Público ve servicios activos"
  on public.servicios for select using (activo = true);

-- Bloqueos: solo el owner los gestiona; público puede verlos para saber disponibilidad
create policy "Owner gestiona bloqueos"
  on public.bloqueos for all using (
    negocio_id in (select id from public.negocios where owner_id = auth.uid())
  );
create policy "Público ve bloqueos"
  on public.bloqueos for select using (true);

-- Clientes: el negocio ve sus clientes, público puede insertar (al reservar)
create policy "Owner ve sus clientes"
  on public.clientes for select using (
    negocio_id in (select id from public.negocios where owner_id = auth.uid())
  );
create policy "Público puede crear cliente"
  on public.clientes for insert with check (true);

-- Reservas: owner ve las suyas, público puede insertar y ver las propias
create policy "Owner ve reservas de su negocio"
  on public.reservas for all using (
    negocio_id in (select id from public.negocios where owner_id = auth.uid())
  );
create policy "Público puede crear reserva"
  on public.reservas for insert with check (true);
create policy "Cliente ve su reserva"
  on public.reservas for select using (true);  -- se filtra por ID en la app

-- ============================================================
-- DATOS DE EJEMPLO (para probar en desarrollo)
-- ============================================================

-- Descomenta esto para insertar un negocio de prueba
-- (primero debes tener un usuario creado en Supabase Auth)

/*
insert into public.negocios (nombre, slug, email, descripcion, telefono, ciudad, owner_id, horario)
values (
  'El Fader Barbershop',
  'el-fader',
  'contacto@elfader.com',
  'La mejor barbería de la ciudad. Cortes modernos y clásicos.',
  '+593 99 123 4567',
  'Loja',
  'TU-USER-ID-AQUI',
  '{
    "lunes":    {"abierto": true,  "desde": "08:00", "hasta": "19:00"},
    "martes":   {"abierto": true,  "desde": "08:00", "hasta": "19:00"},
    "miercoles":{"abierto": true,  "desde": "08:00", "hasta": "19:00"},
    "jueves":   {"abierto": true,  "desde": "08:00", "hasta": "19:00"},
    "viernes":  {"abierto": true,  "desde": "08:00", "hasta": "20:00"},
    "sabado":   {"abierto": true,  "desde": "09:00", "hasta": "17:00"},
    "domingo":  {"abierto": false, "desde": null,    "hasta": null}
  }'::jsonb
);
*/
