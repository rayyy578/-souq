-- Function to decrement product stock
create or replace function decrement_stock(product_id uuid, qty integer)
returns void as $$
  update products set stock = stock - qty where id = product_id and stock >= qty;
$$ language sql;
