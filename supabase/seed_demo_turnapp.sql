-- ============================================================
-- TurnApp — Negocio de demostración (slug: demo)
-- Ejecutar en Supabase → SQL Editor después de la migración 015.
--
-- 1) Ejecuta este script completo.
-- 2) Renueva las reservas ficticias (próximos días) con el cron:
--    curl -sS -H "Authorization: Bearer $CRON_SECRET" \
--      "https://TU_DOMINIO/api/cron/refresh-demo-reservations"
--    (misma variable CRON_SECRET que /api/recordatorios)
-- ============================================================

begin;

-- IDs fijos (idempotente al re-ejecutar)
-- negocio
-- barberos: ...011, ...012, ...013
-- servicios: ...021–...026

delete from public.reservas
where negocio_id = 'd1000000-0000-4000-8000-000000000001'::uuid;
delete from public.clientes
where negocio_id = 'd1000000-0000-4000-8000-000000000001'::uuid;
delete from public.barberos
where negocio_id = 'd1000000-0000-4000-8000-000000000001'::uuid;
delete from public.servicios
where negocio_id = 'd1000000-0000-4000-8000-000000000001'::uuid;
delete from public.negocios
where id = 'd1000000-0000-4000-8000-000000000001'::uuid;

insert into public.negocios (
  id,
  nombre,
  slug,
  email,
  descripcion,
  telefono,
  direccion,
  ciudad,
  pais,
  whatsapp,
  horario,
  duracion_turno_min,
  anticipacion_min,
  max_dias_adelanto,
  cancelacion_permitida,
  cancelacion_horas_minimo,
  cancelacion_max_por_mes,
  cancelacion_mensaje,
  plan,
  plan_expira_at,
  trial_expira_at,
  activo,
  owner_id,
  tipo_negocio,
  is_demo,
  timezone,
  theme_primary,
  recordatorio_email_cliente,
  recordatorio_whatsapp_cliente,
  logo_url
) values (
  'd1000000-0000-4000-8000-000000000001'::uuid,
  'Barbería Demo TurnApp',
  'demo',
  'demo@turnapp.lat',
  'Explora cómo funciona TurnApp. Este es un negocio de demostración.',
  '+593987122959',
  'Cuenca, Ecuador',
  'Cuenca',
  'EC',
  '+593987122959',
  '{
    "lunes":    {"abierto": true,  "desde": "09:00", "hasta": "18:00"},
    "martes":   {"abierto": true,  "desde": "09:00", "hasta": "18:00"},
    "miercoles":{"abierto": true,  "desde": "09:00", "hasta": "18:00"},
    "jueves":   {"abierto": true,  "desde": "09:00", "hasta": "18:00"},
    "viernes":  {"abierto": true,  "desde": "09:00", "hasta": "18:00"},
    "sabado":   {"abierto": true,  "desde": "09:00", "hasta": "14:00"},
    "domingo":  {"abierto": false, "desde": null,    "hasta": null}
  }'::jsonb,
  30,
  0,
  30,
  true,
  2,
  3,
  'Demostración: las cancelaciones no aplican.',
  'pro',
  '2035-12-31 23:59:59+00'::timestamptz,
  null,
  true,
  null,
  'barberia',
  true,
  'America/Guayaquil',
  '#0D9B6A',
  false,
  false,
  'https://turnapp.lat/favicon.svg'
);

insert into public.barberos (id, negocio_id, nombre, foto_url, bio, activo, orden) values
  ('d1000000-0000-4000-8000-000000000011'::uuid, 'd1000000-0000-4000-8000-000000000001'::uuid, 'Carlos Méndez', null, 'Barbero Senior', true, 0),
  ('d1000000-0000-4000-8000-000000000012'::uuid, 'd1000000-0000-4000-8000-000000000001'::uuid, 'Ana Paredes', null, 'Estilista', true, 1),
  ('d1000000-0000-4000-8000-000000000013'::uuid, 'd1000000-0000-4000-8000-000000000001'::uuid, 'José Ruiz', null, 'Barbero', true, 2);

insert into public.servicios (id, negocio_id, nombre, descripcion, duracion, precio, activo, orden) values
  ('d1000000-0000-4000-8000-000000000021'::uuid, 'd1000000-0000-4000-8000-000000000001'::uuid, 'Corte Clásico', null, 30, 8.00, true, 0),
  ('d1000000-0000-4000-8000-000000000022'::uuid, 'd1000000-0000-4000-8000-000000000001'::uuid, 'Corte + Barba', null, 45, 12.00, true, 1),
  ('d1000000-0000-4000-8000-000000000023'::uuid, 'd1000000-0000-4000-8000-000000000001'::uuid, 'Degradado Premium', null, 30, 15.00, true, 2),
  ('d1000000-0000-4000-8000-000000000024'::uuid, 'd1000000-0000-4000-8000-000000000001'::uuid, 'Coloración', null, 60, 25.00, true, 3),
  ('d1000000-0000-4000-8000-000000000025'::uuid, 'd1000000-0000-4000-8000-000000000001'::uuid, 'Tratamiento Capilar', null, 40, 18.00, true, 4),
  ('d1000000-0000-4000-8000-000000000026'::uuid, 'd1000000-0000-4000-8000-000000000001'::uuid, 'Manicure Express', null, 25, 10.00, true, 5);

commit;

-- Reservas de ejemplo: ejecutar GET /api/cron/refresh-demo-reservations con CRON_SECRET
-- (o desplegar y dejar el cron diario en vercel.json).
