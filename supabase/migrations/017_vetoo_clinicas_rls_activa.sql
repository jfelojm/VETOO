-- Reparación: si 016 falló por columna `activa` vs `activo`, vuelve a crear políticas alineadas con tu esquema.
-- Ejecuta esto en SQL Editor si ya aplicaste 016 parcialmente.

drop policy if exists "clinicas_select_public_or_owner" on public.clinicas;
drop policy if exists "clinicas_insert_owner" on public.clinicas;
drop policy if exists "clinicas_update_owner" on public.clinicas;

drop policy if exists "usuarios_select_own_clinica" on public.usuarios;
drop policy if exists "usuarios_insert_own_clinica" on public.usuarios;
drop policy if exists "usuarios_update_self" on public.usuarios;

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
