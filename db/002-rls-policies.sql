-- Users: users can view their own profile
alter table users enable row level security;

create policy "Users can view own profile"
  on users for select
  using (auth.uid()::uuid = id);

create policy "Users can update own profile"
  on users for update
  using (auth.uid()::uuid = id)
  with check (auth.uid()::uuid = id);

-- Sellers: anyone can view approved sellers, sellers can update own
alter table sellers enable row level security;

create policy "Anyone can view approved sellers"
  on sellers for select
  using (approved = true);

create policy "Sellers can update own"
  on sellers for update
  using (user_id = auth.uid()::uuid);

-- Products: anyone can view active products, sellers manage own
alter table products enable row level security;

create policy "Anyone can view active products"
  on products for select
  using (is_active = true);

create policy "Sellers can manage own products"
  on products for all
  using (
    seller_id in (
      select id from sellers where user_id = auth.uid()::uuid
    )
  );

-- Orders: buyers see their own, sellers see orders with their products, admin sees all
alter table orders enable row level security;

create policy "Buyers see own orders"
  on orders for select
  using (buyer_id = auth.uid()::uuid);

create policy "Sellers see orders with their products"
  on orders for select
  using (
    id in (
      select order_id from order_items where seller_id in (
        select id from sellers where user_id = auth.uid()::uuid
      )
    )
  );

create policy "Admin sees all orders"
  on orders for select
  using (
    exists (select 1 from users where id = auth.uid()::uuid and role = 'admin')
  );

create policy "Buyers can create orders"
  on orders for insert
  with check (buyer_id = auth.uid()::uuid);

-- Order items: sellers see their items, buyers see items from their orders
alter table order_items enable row level security;

create policy "Buyers see items from their orders"
  on order_items for select
  using (
    order_id in (select id from orders where buyer_id = auth.uid()::uuid)
  );

create policy "Sellers see their order items"
  on order_items for select
  using (
    seller_id in (
      select id from sellers where user_id = auth.uid()::uuid
    )
  );

create policy "System can create order items"
  on order_items for insert
  with check (true);

-- Commissions: sellers see own, admin sees all
alter table commissions enable row level security;

create policy "Sellers see own commissions"
  on commissions for select
  using (
    seller_id in (
      select id from sellers where user_id = auth.uid()::uuid
    )
  );

create policy "Admin sees all commissions"
  on commissions for select
  using (
    exists (select 1 from users where id = auth.uid()::uuid and role = 'admin')
  );
