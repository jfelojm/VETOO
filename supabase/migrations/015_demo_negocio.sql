-- Negocio de demostración pública (/reservar/demo): sin dueño en auth, solo datos de lectura + reservas ficticias.

alter table public.negocios
  add column if not exists is_demo boolean not null default false;

comment on column public.negocios.is_demo is
  'true = exploración pública; no se permiten reservas reales (API y UI bloquean).';

alter table public.negocios
  add column if not exists timezone text default 'America/Guayaquil';

comment on column public.negocios.timezone is
  'Zona IANA del negocio (reservas/slots); por defecto America/Guayaquil.';

alter table public.negocios
  add column if not exists theme_primary text;

comment on column public.negocios.theme_primary is
  'Color primario hex opcional para la página pública de reservas.';

-- Demo sin cuenta owner: owner_id puede ser NULL solo si is_demo = true
alter table public.negocios alter column owner_id drop not null;

alter table public.negocios drop constraint if exists negocios_demo_owner_check;

alter table public.negocios
  add constraint negocios_demo_owner_check check (
    (is_demo = true and owner_id is null)
    or (is_demo = false and owner_id is not null)
  );

create index if not exists idx_negocios_slug_demo on public.negocios (slug) where is_demo = true;
