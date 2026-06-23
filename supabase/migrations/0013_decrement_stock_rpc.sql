-- Atomic stock decrement for order finalization.
--
-- The previous stock decrement was a read-then-write on the products
-- table inside the verify route. Two buyers whose orders finalize
-- concurrently on the same product can both read stock=5, both
-- decrement by 1, and both write back stock=4. The store is now
-- oversold by 1 with no way to detect it. This function turns the
-- decrement into a single SQL statement gated by a `stock >= qty`
-- predicate, which Postgres evaluates atomically under the row lock
-- taken by UPDATE. The first concurrent caller wins; the second
-- caller's WHERE clause fails, no rows are returned, and the
-- caller knows to fail the order.
--
-- Returns the new stock on success, NULL when the predicate failed
-- (stock was insufficient at the time of the update).
--
-- The function is SECURITY DEFINER so the verify route can call it
-- with the service-role client without needing to grant EXECUTE to
-- the authenticated role. The body only ever updates one row by
-- primary key, so there's no escalation surface.
create or replace function public.decrement_product_stock(
  p_id uuid,
  qty integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_stock integer;
begin
  update public.products
     set stock = stock - qty
   where id = p_id
     and stock >= qty
  returning stock into new_stock;

  return new_stock;
end;
$$;

-- The service role can call it from the verify route; we don't need
-- to grant EXECUTE to the public or authenticated roles because
-- end users don't have a use case for decrementing stock directly.
revoke execute on function public.decrement_product_stock(uuid, integer) from public;
revoke execute on function public.decrement_product_stock(uuid, integer) from authenticated;
grant execute on function public.decrement_product_stock(uuid, integer) to service_role;
