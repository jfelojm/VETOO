-- Fotos de servicios (ruta en Storage bucket privado service-photos: negocio_id/servicio_id/archivo)

ALTER TABLE public.servicios
  ADD COLUMN IF NOT EXISTS photo_url text;

COMMENT ON COLUMN public.servicios.photo_url IS 'Ruta del objeto en el bucket service-photos (no URL pública)';

-- Bucket privado: JPG/PNG/WEBP, máx 3 MB
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-photos',
  'service-photos',
  false,
  3145728,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "service_photos owner insert" ON storage.objects;
DROP POLICY IF EXISTS "service_photos owner update" ON storage.objects;
DROP POLICY IF EXISTS "service_photos owner delete" ON storage.objects;
DROP POLICY IF EXISTS "service_photos select" ON storage.objects;

-- Solo el dueño del negocio sube/actualiza/borra archivos bajo su negocio y un servicio existente
CREATE POLICY "service_photos owner insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'service-photos'
    AND EXISTS (
      SELECT 1
      FROM public.servicios s
      JOIN public.negocios n ON n.id = s.negocio_id
      WHERE n.owner_id = auth.uid()
        AND s.negocio_id = (split_part(name, '/', 1))::uuid
        AND s.id = (split_part(name, '/', 2))::uuid
    )
  );

CREATE POLICY "service_photos owner update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'service-photos'
    AND EXISTS (
      SELECT 1 FROM public.negocios n
      WHERE n.id = (split_part(name, '/', 1))::uuid
        AND n.owner_id = auth.uid()
    )
  );

CREATE POLICY "service_photos owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'service-photos'
    AND EXISTS (
      SELECT 1 FROM public.negocios n
      WHERE n.id = (split_part(name, '/', 1))::uuid
        AND n.owner_id = auth.uid()
    )
  );

-- Lectura: dueño (cualquier objeto bajo su negocio) o público si es la foto activa del servicio
CREATE POLICY "service_photos select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'service-photos'
    AND (
      EXISTS (
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
