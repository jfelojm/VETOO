-- Notas internas del staff por cliente + fotos en Storage (bucket privado client-notes)

-- ============================================================
-- TABLAS
-- ============================================================
create table public.client_notes (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  negocio_id  uuid not null references public.negocios(id) on delete cascade,
  client_id   uuid not null references public.clientes(id) on delete cascade,
  staff_id    uuid not null references public.barberos(id) on delete restrict,
  content     text not null default ''
);

create index idx_client_notes_client on public.client_notes(client_id);
create index idx_client_notes_negocio on public.client_notes(negocio_id);
create index idx_client_notes_created on public.client_notes(created_at desc);

create table public.client_note_photos (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  note_id       uuid not null references public.client_notes(id) on delete cascade,
  storage_path  text not null
);

create unique index idx_client_note_photos_note_path on public.client_note_photos(note_id, storage_path);
create index idx_client_note_photos_note on public.client_note_photos(note_id);

create trigger client_notes_updated_at
  before update on public.client_notes
  for each row execute function public.handle_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table public.client_notes enable row level security;
alter table public.client_note_photos enable row level security;

create or replace function public.is_staff_of_negocio(p_negocio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.negocios n where n.id = p_negocio_id and n.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.barberos b where b.negocio_id = p_negocio_id and b.user_id = auth.uid()
  );
$$;

-- Notas: lectura para owner o staff del negocio
create policy "Staff u owner leen notas del negocio"
  on public.client_notes for select
  using (public.is_staff_of_negocio(negocio_id));

-- Alta: autor = barbero vinculado al usuario (dueño debe tener fila en barberos con su user_id)
create policy "Staff inserta nota como autor"
  on public.client_notes for insert
  with check (
    public.is_staff_of_negocio(negocio_id)
    and exists (
      select 1 from public.clientes c
      where c.id = client_id and c.negocio_id = client_notes.negocio_id
    )
    and exists (
      select 1 from public.barberos b
      where b.id = staff_id
        and b.negocio_id = client_notes.negocio_id
        and b.user_id = auth.uid()
    )
  );

create policy "Staff actualiza sus notas"
  on public.client_notes for update
  using (
    public.is_staff_of_negocio(negocio_id)
    and exists (
      select 1 from public.barberos b
      where b.id = client_notes.staff_id and b.user_id = auth.uid()
    )
  )
  with check (
    public.is_staff_of_negocio(negocio_id)
    and exists (
      select 1 from public.barberos b
      where b.id = client_notes.staff_id and b.user_id = auth.uid()
    )
  );

create policy "Staff elimina sus notas"
  on public.client_notes for delete
  using (
    public.is_staff_of_negocio(negocio_id)
    and exists (
      select 1 from public.barberos b
      where b.id = client_notes.staff_id and b.user_id = auth.uid()
    )
  );

-- Fotos: ligadas a nota visible por staff
create policy "Staff lee fotos de notas del negocio"
  on public.client_note_photos for select
  using (
    exists (
      select 1 from public.client_notes n
      where n.id = note_id and public.is_staff_of_negocio(n.negocio_id)
    )
  );

create policy "Autor inserta fotos en su nota"
  on public.client_note_photos for insert
  with check (
    exists (
      select 1 from public.client_notes n
      where n.id = note_id and public.is_staff_of_negocio(n.negocio_id)
      and exists (
        select 1 from public.barberos b
        where b.id = n.staff_id and b.user_id = auth.uid()
      )
    )
  );

create policy "Autor elimina fotos de su nota"
  on public.client_note_photos for delete
  using (
    exists (
      select 1 from public.client_notes n
      where n.id = note_id and public.is_staff_of_negocio(n.negocio_id)
      and exists (
        select 1 from public.barberos b
        where b.id = n.staff_id and b.user_id = auth.uid()
      )
    )
  );

-- Clientes: el staff del negocio puede ver fichas (antes solo el dueño)
create policy "Staff ve clientes de su negocio"
  on public.clientes for select
  using (
    exists (
      select 1 from public.barberos b
      where b.user_id = auth.uid() and b.negocio_id = clientes.negocio_id
    )
  );

-- ============================================================
-- STORAGE: bucket privado client-notes (ruta: negocio_id/note_id/archivo)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-notes',
  'client-notes',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "client_notes storage select"
  on storage.objects for select
  using (
    bucket_id = 'client-notes'
    and public.is_staff_of_negocio((split_part(name, '/', 1))::uuid)
  );

create policy "client_notes storage insert"
  on storage.objects for insert
  with check (
    bucket_id = 'client-notes'
    and public.is_staff_of_negocio((split_part(name, '/', 1))::uuid)
  );

create policy "client_notes storage update"
  on storage.objects for update
  using (
    bucket_id = 'client-notes'
    and public.is_staff_of_negocio((split_part(name, '/', 1))::uuid)
  );

create policy "client_notes storage delete"
  on storage.objects for delete
  using (
    bucket_id = 'client-notes'
    and public.is_staff_of_negocio((split_part(name, '/', 1))::uuid)
  );
