-- Plan Básico: hasta 5 profesionales activos y servicios ilimitados (alineado con src/lib/plan-acceso.ts)

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
    return 5;
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
    return 5;
  end if;

  if pl in ('pro', 'premium') and (pe is null or pe > now()) then
    return 999;
  end if;

  if pl = 'basic' and (pe is null or pe > now()) then
    return 5;
  end if;

  return 5;
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
    return 999;
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
    return 999;
  end if;

  if pl in ('pro', 'premium') and (pe is null or pe > now()) then
    return 999;
  end if;

  if pl = 'basic' and (pe is null or pe > now()) then
    return 999;
  end if;

  return 999;
end;
$$;
