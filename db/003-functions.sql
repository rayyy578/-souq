-- Function to decrement product stock
create or replace function decrement_stock(product_id uuid, qty integer)
returns void as $$
  update products set stock = stock - qty where id = product_id and stock >= qty;
$$ language sql;

-- Function to handle new auth user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Create public users row
  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'buyer')
  ) on conflict (id) do nothing;

  -- If seller role, create sellers row
  if new.raw_user_meta_data->>'role' = 'seller' then
    insert into public.sellers (user_id, store_name, approved)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
      false
    ) on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer;
