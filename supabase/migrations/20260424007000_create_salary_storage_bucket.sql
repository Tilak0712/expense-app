-- Create storage bucket for salary uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('salary-uploads', 'salary-uploads', false, 10485760, ARRAY[
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/vnd.ms-excel.sheet.macroenabled.12'
])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for salary-uploads bucket
-- Allow managers to upload files
CREATE POLICY "Managers can upload salary files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'salary-uploads' AND
  auth.uid()::text IN (
    SELECT manager_id::text FROM salary_uploads
  ) OR
  auth.role() = 'authenticated'
);

-- Allow managers to view their own uploads
CREATE POLICY "Managers can view own salary files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'salary-uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow finance users to view all salary files
CREATE POLICY "Finance can view all salary files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'salary-uploads' AND
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'finance'
  )
);

-- Allow managers to delete their own uploads
CREATE POLICY "Managers can delete own salary files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'salary-uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
