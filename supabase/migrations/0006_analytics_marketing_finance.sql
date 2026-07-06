-- ============================================================
-- 0006 — ANALYTICS, MARKETING DEPTH, FINANCE DEPTH, STORE SETTINGS
-- ============================================================

-- ---------- ANALYTICS_VIEWS: dedicated storefront/product view log ----------
-- product_events already captures 'view' rows generically; this table adds
-- the richer shape (referrer, visitor_id, country) the Analytics pages
-- (Visitors, Link Traffic, Conversion Rate) are built against, without
-- removing the simpler product_events counters other pages rely on.
create table public.analytics_views (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.users(id) on delete cascade, -- seller/store owner
  product_id uuid references public.products(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  visitor_id text, -- anonymous cookie/localStorage id for uniques when logged out
  referrer text,
  country_code text,
  created_at timestamptz not null default now()
);

create index idx_analytics_views_store on public.analytics_views(store_id, created_at desc);
create index idx_analytics_views_product on public.analytics_views(product_id, created_at desc);

alter table public.analytics_views enable row level security;
create policy "analytics_views_insert_anyone" on public.analytics_views for insert with check (true);
create policy "analytics_views_seller_read" on public.analytics_views for select using (store_id = auth.uid());

-- ---------- ANALYTICS_SALES: denormalized per-sale rollup row ----------
-- One row per order_item at confirmation time — keeps the Analytics /
-- Revenue / Reports pages fast without joining orders+order_items+products
-- every time, and gives them a stable "date" column independent of any
-- later order status changes (e.g. refunds keep the historical fact).
create table public.analytics_sales (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  order_item_id uuid references public.order_items(id) on delete set null,
  amount numeric not null,
  currency text not null default 'XAF',
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_analytics_sales_seller on public.analytics_sales(seller_id, date desc);
create index idx_analytics_sales_product on public.analytics_sales(product_id);

alter table public.analytics_sales enable row level security;
create policy "analytics_sales_seller_read" on public.analytics_sales for select using (seller_id = auth.uid());

-- Populate analytics_sales automatically whenever the webhook confirms an
-- order (order_items insert already happens at checkout time, at
-- awaiting_payment; we hook the *order* status flip to confirmed instead,
-- since that is the actual "sale" moment).
create or replace function public.record_analytics_sales()
returns trigger language plpgsql as $$
begin
  if new.status = 'confirmed' and (old.status is distinct from 'confirmed') then
    insert into public.analytics_sales (seller_id, product_id, order_id, order_item_id, amount, currency, date)
    select oi.seller_id, oi.product_id, oi.order_id, oi.id, oi.seller_credit, new.currency, now()
    from public.order_items oi
    where oi.order_id = new.id;
  end if;
  return new;
end;
$$;

create trigger trg_orders_record_analytics_sales
  after update on public.orders
  for each row execute function public.record_analytics_sales();

-- ---------- STORE_FOLLOWERS ----------
create table public.store_followers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.users(id) on delete cascade, -- the seller being followed
  user_id uuid not null references public.users(id) on delete cascade,  -- the buyer following
  created_at timestamptz not null default now(),
  unique (store_id, user_id)
);

create index idx_store_followers_store on public.store_followers(store_id);
create index idx_store_followers_user on public.store_followers(user_id);

alter table public.store_followers enable row level security;
create policy "store_followers_public_read" on public.store_followers for select using (true);
create policy "store_followers_owner_manage" on public.store_followers for all using (user_id = auth.uid());

-- Keep a denormalized follower count on users for fast storefront rendering.
alter table public.users add column if not exists follower_count integer not null default 0;

create or replace function public.recalc_follower_count()
returns trigger language plpgsql as $$
declare
  s_id uuid := coalesce(new.store_id, old.store_id);
begin
  update public.users set follower_count = (select count(*) from public.store_followers where store_id = s_id) where id = s_id;
  return null;
end;
$$;

create trigger trg_store_followers_ins after insert on public.store_followers
  for each row execute function public.recalc_follower_count();
create trigger trg_store_followers_del after delete on public.store_followers
  for each row execute function public.recalc_follower_count();

-- ---------- CUSTOM_CHARGES: seller-defined extra fees/charges at checkout ----------
create table public.custom_charges (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('percentage', 'fixed')),
  value numeric not null check (value >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_custom_charges_store on public.custom_charges(store_id);

alter table public.custom_charges enable row level security;
create policy "custom_charges_public_read_active" on public.custom_charges for select using (is_active = true);
create policy "custom_charges_seller_manage" on public.custom_charges for all using (store_id = auth.uid());

-- ---------- WEBHOOKS: seller-configured outbound event notifications ----------
create table public.webhooks (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.users(id) on delete cascade,
  url text not null,
  events text[] not null default array['order.completed'],
  secret text not null default encode(gen_random_bytes(16), 'hex'),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_webhooks_store on public.webhooks(store_id);

alter table public.webhooks enable row level security;
create policy "webhooks_owner_manage" on public.webhooks for all using (store_id = auth.uid());

create table public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_id uuid not null references public.webhooks(id) on delete cascade,
  event text not null,
  payload jsonb not null,
  status_code integer,
  response_body text,
  succeeded boolean not null default false,
  attempted_at timestamptz not null default now()
);

create index idx_webhook_deliveries_webhook on public.webhook_deliveries(webhook_id, attempted_at desc);

alter table public.webhook_deliveries enable row level security;
create policy "webhook_deliveries_owner_read" on public.webhook_deliveries for select using (
  webhook_id in (select id from public.webhooks where store_id = auth.uid())
);

-- ---------- STORE SETTINGS: custom domain + checkout config ----------
alter table public.users
  add column if not exists custom_domain text unique,
  add column if not exists checkout_settings jsonb not null default '{
    "collect_phone": false,
    "collect_address_city": false,
    "show_category_sidebar": true,
    "buy_button_text": null,
    "fee_payer": "customer"
  }'::jsonb;

-- ---------- BROADCASTS: lightweight log of seller mass-messages ----------
-- Actual delivery reuses the notifications table (one row per recipient);
-- this table is just the seller-facing "what did I send and when" log so
-- the Broadcasts page doesn't need to reverse-engineer history by
-- de-duplicating notification rows.
create table public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  target text not null default 'all' check (target in ('all', 'one')),
  target_email text,
  recipient_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_broadcasts_seller on public.broadcasts(seller_id, created_at desc);

alter table public.broadcasts enable row level security;
create policy "broadcasts_owner_manage" on public.broadcasts for all using (seller_id = auth.uid());
