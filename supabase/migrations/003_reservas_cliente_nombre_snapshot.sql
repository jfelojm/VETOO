-- Nombre tal como lo ingresó al reservar (varias reservas pueden compartir teléfono / cliente_id)
alter table public.reservas
  add column if not exists cliente_nombre_snapshot text;

comment on column public.reservas.cliente_nombre_snapshot is
  'Nombre del cliente en el momento de la reserva; evita mostrar siempre el nombre del registro clientes cuando hay mismo teléfono.';
