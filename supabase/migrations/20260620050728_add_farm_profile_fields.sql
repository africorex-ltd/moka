-- Add farm profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS farm_logo_url        TEXT,
  ADD COLUMN IF NOT EXISTS farm_address         TEXT,
  ADD COLUMN IF NOT EXISTS farm_phone           TEXT,
  ADD COLUMN IF NOT EXISTS farm_email           TEXT,
  ADD COLUMN IF NOT EXISTS farm_registration_no TEXT,
  ADD COLUMN IF NOT EXISTS milk_market          TEXT DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS county               TEXT;

-- Storage bucket for farm logos (public read, owner write, max 2MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'farm-logos',
  'farm-logos',
  true,
  2097152,
  ARRAY['image/png','image/jpeg','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can upload their own farm logo') THEN
    CREATE POLICY "Users can upload their own farm logo" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='farm-logos' AND (storage.foldername(name))[1]=auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can update their own farm logo') THEN
    CREATE POLICY "Users can update their own farm logo" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='farm-logos' AND (storage.foldername(name))[1]=auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can delete their own farm logo') THEN
    CREATE POLICY "Users can delete their own farm logo" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='farm-logos' AND (storage.foldername(name))[1]=auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Farm logos are publicly readable') THEN
    CREATE POLICY "Farm logos are publicly readable" ON storage.objects FOR SELECT TO public USING (bucket_id='farm-logos');
  END IF;
END $$;
