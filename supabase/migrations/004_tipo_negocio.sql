alter table public.negocios
  add column if not exists tipo_negocio text default 'barberia';

comment on column public.negocios.tipo_negocio is
  'Segmentación: barberia, peluqueria, salon_belleza, manicure, maquillaje, unisex, spa.';
