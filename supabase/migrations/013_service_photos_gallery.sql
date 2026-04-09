-- Galería de fotos por servicio (máx. 5 en API). photo_url en servicios se mantiene como legacy.

CREATE TABLE IF NOT EXISTS public.servicio_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  servicio_id uuid NOT NULL REFERENCES public.servicios(id) ON DELETE CASCADE,
  negocio_id uuid NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  orden integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_servicio_fotos_servicio ON public.servicio_fotos(servicio_id);
CREATE INDEX IF NOT EXISTS idx_servicio_fotos_negocio ON public.servicio_fotos(negocio_id);
CREATE INDEX IF NOT EXISTS idx_servicio_fotos_servicio_orden ON public.servicio_fotos(servicio_id, orden);

COMMENT ON TABLE public.servicio_fotos IS 'Fotos del servicio en bucket service-photos; máximo 5 por servicio (aplicación)';

-- Migrar datos existentes desde photo_url (una fila por servicio)
INSERT INTO public.servicio_fotos (servicio_id, negocio_id, storage_path, orden)
SELECT s.id, s.negocio_id, s.photo_url, 0
FROM public.servicios s
WHERE s.photo_url IS NOT NULL AND trim(s.photo_url) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.servicio_fotos f
    WHERE f.servicio_id = s.id AND f.storage_path = s.photo_url
  );

ALTER TABLE public.servicio_fotos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "servicio_fotos owner select" ON public.servicio_fotos;
DROP POLICY IF EXISTS "servicio_fotos owner insert" ON public.servicio_fotos;
DROP POLICY IF EXISTS "servicio_fotos owner update" ON public.servicio_fotos;
DROP POLICY IF EXISTS "servicio_fotos owner delete" ON public.servicio_fotos;

CREATE POLICY "servicio_fotos owner select"
  ON public.servicio_fotos FOR SELECT
  USING (
    negocio_id IN (SELECT id FROM public.negocios WHERE owner_id = auth.uid())
  );

CREATE POLICY "servicio_fotos owner insert"
  ON public.servicio_fotos FOR INSERT
  WITH CHECK (
    negocio_id IN (SELECT id FROM public.negocios WHERE owner_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.servicios s
      WHERE s.id = servicio_id AND s.negocio_id = servicio_fotos.negocio_id
    )
  );

CREATE POLICY "servicio_fotos owner update"
  ON public.servicio_fotos FOR UPDATE
  USING (
    negocio_id IN (SELECT id FROM public.negocios WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    negocio_id IN (SELECT id FROM public.negocios WHERE owner_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.servicios s
      WHERE s.id = servicio_id AND s.negocio_id = servicio_fotos.negocio_id
    )
  );

CREATE POLICY "servicio_fotos owner delete"
  ON public.servicio_fotos FOR DELETE
  USING (
    negocio_id IN (SELECT id FROM public.negocios WHERE owner_id = auth.uid())
  );

-- Storage: lectura pública si la ruta está en servicio_fotos (activo) o legacy photo_url, o dueño
DROP POLICY IF EXISTS "service_photos select" ON storage.objects;

CREATE POLICY "service_photos select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'service-photos'
    AND (
      EXISTS (
        SELECT 1
        FROM public.servicio_fotos f
        JOIN public.servicios s ON s.id = f.servicio_id
        JOIN public.negocios n ON n.id = s.negocio_id
        WHERE f.storage_path = name
          AND s.activo = true
          AND n.activo = true
      )
      OR EXISTS (
        SELECT 1
        FROM public.servicios s
        JOIN public.negocios n ON n.id = s.negocio_id
        WHERE s.activo = true
          AND n.activo = true
          AND s.photo_url = name
      )
      OR EXISTS (
        SELECT 1 FROM public.negocios n
        WHERE n.id = (split_part(name, '/', 1))::uuid
          AND n.owner_id = auth.uid()
      )
    )
  );
