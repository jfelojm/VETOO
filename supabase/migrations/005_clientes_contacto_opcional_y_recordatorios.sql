-- Cliente: teléfono o email (al menos uno en app); teléfono ya no es obligatorio en BD
-- Negocio: preferencias de canal para recordatorios automáticos (24h / 2h)

alter table public.clientes drop constraint if exists clientes_negocio_id_telefono_key;

alter table public.clientes alter column telefono drop not null;

create unique index if not exists clientes_negocio_telefono_unique
  on public.clientes (negocio_id, telefono)
  where telefono is not null and btrim(telefono) <> '';

create unique index if not exists clientes_negocio_email_lower_unique
  on public.clientes (negocio_id, lower(btrim(email)))
  where email is not null and btrim(email) <> '';

alter table public.negocios
  add column if not exists recordatorio_email_cliente boolean not null default true;

alter table public.negocios
  add column if not exists recordatorio_whatsapp_cliente boolean not null default false;

comment on column public.negocios.recordatorio_email_cliente is
  'Si true, el cron envía recordatorio por email cuando el cliente tiene correo.';

comment on column public.negocios.recordatorio_whatsapp_cliente is
  'Si true, el cron intenta notificación por WhatsApp/teléfono (webhook o integración externa).';
