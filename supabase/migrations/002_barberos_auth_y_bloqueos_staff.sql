-- Vincular barberos con cuenta auth y permitir que el staff gestione sus propios bloqueos

alter table public.barberos
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.barberos
  add column if not exists email text;

create index if not exists idx_barberos_user_id on public.barberos(user_id);

-- Políticas: el profesional puede insertar/actualizar/borrar bloqueos donde él es el barbero vinculado
create policy "Barbero inserta sus bloqueos"
  on public.bloqueos for insert
  with check (
    exists (
      select 1 from public.barberos b
      where b.id = barbero_id and b.user_id = auth.uid()
    )
  );

create policy "Barbero actualiza sus bloqueos"
  on public.bloqueos for update
  using (
    exists (
      select 1 from public.barberos b
      where b.id = barbero_id and b.user_id = auth.uid()
    )
  );

create policy "Barbero elimina sus bloqueos"
  on public.bloqueos for delete
  using (
    exists (
      select 1 from public.barberos b
      where b.id = barbero_id and b.user_id = auth.uid()
    )
  );
