-- Límites según plan del negocio (coherente con src/lib/plan-acceso.ts)

create or replace function public.limite_barberos_negocio(p_negocio_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  pl text;
  pe timestamptz;
  te timestamptz;
begin
  select n.plan::text, n.plan_expira_at, n.trial_expira_at
  into pl, pe, te
  from public.negocios n
  where n.id = p_negocio_id;

  if pl is null then
    return 2;
  end if;

  if pl = 'cancelled' then
    return coalesce(
      (select count(*)::int from public.barberos b where b.negocio_id = p_negocio_id and b.activo = true),
      0
    );
  end if;

  if pl = 'trial' and te is not null and te > now() then
    return 999;
  end if;

  if pl = 'trial' then
    return 2;
  end if;

  if pl in ('pro', 'premium') and (pe is null or pe > now()) then
    return 999;
  end if;

  if pl = 'basic' and (pe is null or pe > now()) then
    return 2;
  end if;

  return 2;
end;
$$;

create or replace function public.limite_servicios_negocio(p_negocio_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  pl text;
  pe timestamptz;
  te timestamptz;
begin
  select n.plan::text, n.plan_expira_at, n.trial_expira_at
  into pl, pe, te
  from public.negocios n
  where n.id = p_negocio_id;

  if pl is null then
    return 10;
  end if;

  if pl = 'cancelled' then
    return coalesce(
      (select count(*)::int from public.servicios s where s.negocio_id = p_negocio_id),
      0
    );
  end if;

  if pl = 'trial' and te is not null and te > now() then
    return 999;
  end if;

  if pl = 'trial' then
    return 10;
  end if;

  if pl in ('pro', 'premium') and (pe is null or pe > now()) then
    return 999;
  end if;

  if pl = 'basic' and (pe is null or pe > now()) then
    return 10;
  end if;

  return 10;
end;
$$;

create or replace function public.fn_before_barbero_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lim int;
  activos int;
begin
  lim := public.limite_barberos_negocio(new.negocio_id);

  if coalesce(new.activo, true) = false then
    return new;
  end if;

  select count(*)::int into activos
  from public.barberos
  where negocio_id = new.negocio_id
    and activo = true
    and id is distinct from new.id;

  activos := activos + 1;

  if activos > lim then
    raise exception 'Límite de staff del plan alcanzado (%). Actualiza a Pro para más cupos.', lim
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_barbero_plan_limit on public.barberos;
create trigger trg_barbero_plan_limit
  before insert or update of activo, negocio_id
  on public.barberos
  for each row
  execute function public.fn_before_barbero_plan();

create or replace function public.fn_before_servicio_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lim int;
  total int;
begin
  if tg_op = 'UPDATE' then
    return new;
  end if;

  lim := public.limite_servicios_negocio(new.negocio_id);

  select count(*)::int into total
  from public.servicios
  where negocio_id = new.negocio_id;

  total := total + 1;

  if total > lim then
    raise exception 'Límite de servicios del plan alcanzado (%). Sube de plan para agregar más.', lim
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_servicio_plan_limit on public.servicios;
create trigger trg_servicio_plan_limit
  before insert
  on public.servicios
  for each row
  execute function public.fn_before_servicio_plan();
