-- ============================================================
-- 0005 — WIDEN PRODUCT & ORDER MODEL
-- Adds a richer content/delivery shape (product_content, PIN-based
-- buyer_access, delivery_data on orders) without breaking anything
-- already built on top of 0001-0004. Existing columns are untouched;
-- only additive columns and new tables are introduced.
-- ============================================================

-- ---------- PRODUCTS: broaden metadata + delivery flexibility ----------
alter table public.products
  add column if not exists compare_price numeric,               -- alias-friendly duplicate of compare_at_price for the richer UI copy
  add column if not exists is_digital boolean not null default true,
  add column if not exists stock_count integer not null default -1, -- -1 = unlimited
  add column if not exists content_data jsonb not null default '{}'::jsonb,
  add column if not exists delivery_method text not null default 'instant'
    check (delivery_method in ('instant', 'manual', 'scheduled', 'account_slot')),
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Keep compare_price and compare_at_price in sync so either name works
-- from application code without a breaking rename.
create or replace function public.sync_compare_price()
returns trigger language plpgsql as $$
begin
  if new.compare_price is distinct from old.compare_price and (new.compare_at_price is null or new.compare_at_price = old.compare_at_price) then
    new.compare_at_price := new.compare_price;
  elsif new.compare_at_price is distinct from old.compare_at_price then
    new.compare_price := new.compare_at_price;
  end if;
  return new;
end;
$$;

create trigger trg_products_sync_compare_price
  before update on public.products
  for each row execute function public.sync_compare_price();

-- ---------- PRODUCT_CONTENT: per-type delivery content ----------
-- One product can have many content rows: course lessons, ebook files,
-- license keys, proxy credentials, etc. This generalizes what used to
-- be baked into single columns on `products` (delivery_link, cred1/2).
create table public.product_content (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  content_type text not null check (content_type in (
    'video', 'file', 'link', 'text', 'credential', 'license_key', 'proxy', 'bundle_item'
  )),
  title text,
  description text,
  url text,
  file_url text,
  file_size bigint,
  duration integer, -- seconds, for video/audio
  order_index integer not null default 0,
  is_preview boolean not null default false, -- viewable before purchase (e.g. course intro)
  metadata jsonb not null default '{}'::jsonb, -- e.g. {"protocol":"socks5","server":"...","port":1080} for proxy
  created_at timestamptz not null default now()
);

create index idx_product_content_product on public.product_content(product_id, order_index);

alter table public.product_content enable row level security;
create policy "product_content_public_read" on public.product_content for select using (
  is_preview = true or product_id in (select id from public.products where status = 'approved')
);
create policy "product_content_seller_manage" on public.product_content for all using (
  product_id in (select id from public.products where seller_id = auth.uid())
);

-- ---------- BUYER_ACCESS: PIN-based access (works for guests, no login) ----------
-- Complements product_sessions (email-gated) with a short numeric PIN a
-- guest can use to re-open their purchase from any device.
create table public.buyer_access (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  pin text not null,
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  seller_id uuid not null references public.users(id) on delete cascade,
  is_active boolean not null default true,
  access_count integer not null default 0,
  last_accessed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_buyer_access_email_pin on public.buyer_access(email, pin);
create index idx_buyer_access_product on public.buyer_access(product_id);

alter table public.buyer_access enable row level security;
create policy "buyer_access_service_only" on public.buyer_access for all using (auth.role() = 'service_role');

-- ---------- ORDERS: delivery_data + richer status/payment metadata ----------
alter table public.orders
  add column if not exists delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'delivered', 'failed')),
  add column if not exists delivery_data jsonb not null default '{}'::jsonb,
  add column if not exists buyer_pin text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Auto-generate a 6-digit buyer PIN on order creation so guests always
-- have a way back into their purchase without needing an account.
create or replace function public.assign_buyer_pin()
returns trigger language plpgsql as $$
begin
  if new.buyer_pin is null then
    new.buyer_pin := lpad(floor(random() * 1000000)::text, 6, '0');
  end if;
  return new;
end;
$$;

create trigger trg_orders_assign_pin
  before insert on public.orders
  for each row execute function public.assign_buyer_pin();
