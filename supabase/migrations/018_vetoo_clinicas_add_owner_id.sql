-- Si tu tabla `clinicas` ya existía sin `owner_id`, las políticas RLS y la app Vetoo la necesitan.
-- Ejecuta este script DESPUÉS de revisar si debes rellenar datos viejos.

alter table public.clinicas
  add column if not exists owner_id uuid references auth.users (id) on delete cascade;

-- Un dueño = una clínica en este MVP (evita duplicados cuando owner_id ya está informado)
create unique index if not exists clinicas_owner_id_key
  on public.clinicas (owner_id)
  where owner_id is not null;

-- Si en tu base la columna del dueño se llama distinto, descomenta y ajusta el nombre:
-- update public.clinicas set owner_id = user_id where owner_id is null and user_id is not null;

comment on column public.clinicas.owner_id is 'Usuario auth dueño de la clínica (multi-tenant Vetoo).';
