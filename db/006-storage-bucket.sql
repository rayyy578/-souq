-- Create product images storage bucket
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to their own folder
create policy "Authenticated users can upload product images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and auth.uid()::uuid = (storage.foldername(name))[1]::uuid
  );

-- Allow authenticated users to update/delete their own files
create policy "Authenticated users can update their own images"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and auth.uid()::uuid = (storage.foldername(name))[1]::uuid
  );

create policy "Authenticated users can delete their own images"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and auth.uid()::uuid = (storage.foldername(name))[1]::uuid
  );

-- Public can read all product images
create policy "Public can view product images"
  on storage.objects for select
  using (bucket_id = 'product-images');
