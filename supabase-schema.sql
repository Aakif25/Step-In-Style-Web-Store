-- ================================================================
-- STEP IN STYLE — SUPABASE DATABASE + RLS + STORAGE SETUP
-- Run this whole file once in Supabase Dashboard → SQL Editor.
-- Then create your admin Auth user and run the admin-user INSERT
-- shown near the bottom of this file.
-- ================================================================

create extension if not exists pgcrypto;

-- ---------- TABLES ----------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Step in Style Admin',
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key default gen_random_uuid()::text,
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  name text not null,
  slug text not null,
  short_description text not null default '',
  category text not null default '',
  product_code text not null default '',
  brand text not null default '',
  price numeric(12,2) not null default 0 check (price >= 0),
  old_price numeric(12,2) not null default 0 check (old_price >= 0),
  stock text not null default 'available' check (stock in ('available','limited','out','coming')),
  qty integer,
  status text not null default 'draft' check (status in ('draft','published','hidden','archived')),
  featured boolean not null default false,
  new_arrival boolean not null default false,
  badge text not null default '',
  views bigint not null default 0,
  media jsonb not null default '{"images":[],"videos":[]}'::jsonb,
  description_blocks jsonb not null default '[]'::jsonb,
  variants jsonb not null default '[]'::jsonb,
  seo jsonb not null default '{"title":"","description":"","keywords":""}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_status_idx on public.products(status);
create index if not exists products_category_idx on public.products(category);

create table if not exists public.product_supplier_private (
  product_id text primary key references public.products(id) on delete cascade,
  supplier text not null default 'A to Z Dropshipping',
  supplier_code text not null default '',
  supplier_url text not null default '',
  supplier_cost numeric(12,2) not null default 0,
  shipping numeric(12,2) not null default 0,
  other_cost numeric(12,2) not null default 0,
  ad_cost numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);

create sequence if not exists public.step_in_style_order_seq start 1;

create table if not exists public.orders (
  id text primary key,
  customer jsonb not null,
  subtotal numeric(12,2) not null default 0,
  delivery numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'new' check (status in ('new','confirmed','submitted','processing','shipped','delivered','cancelled','returned')),
  supplier_order_id text not null default '',
  profit_status text not null default 'pending' check (profit_status in ('pending','received')),
  received_profit numeric(12,2) not null default 0,
  profit_received_date date,
  admin_notes text not null default '',
  source text not null default 'Website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  name text not null,
  qty integer not null check (qty > 0 and qty <= 50),
  price numeric(12,2) not null default 0,
  supplier_cost numeric(12,2) not null default 0,
  shipping numeric(12,2) not null default 0,
  other_cost numeric(12,2) not null default 0,
  ad_cost numeric(12,2) not null default 0,
  supplier_code text not null default '',
  supplier_url text not null default ''
);
create index if not exists order_items_order_idx on public.order_items(order_id);

create table if not exists public.customers (
  id text primary key default gen_random_uuid()::text,
  name text not null default '',
  phone text not null unique,
  email text not null default '',
  orders_count integer not null default 0,
  last_order_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id text primary key default gen_random_uuid()::text,
  product_id text not null references public.products(id) on delete cascade,
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  phone text not null default '',
  rating integer not null check (rating between 1 and 5),
  review_text text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  verified boolean not null default false,
  media jsonb not null default '{"images":[],"videos":[]}'::jsonb,
  reply text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists reviews_product_status_idx on public.reviews(product_id,status);

create table if not exists public.expenses (
  id text primary key,
  expense_date date not null default current_date,
  category text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.offers (
  id text primary key,
  name text not null,
  type text not null default 'percent',
  value numeric(12,2) not null default 0,
  active boolean not null default true,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.banners (
  id text primary key,
  title text not null,
  subtitle text not null default '',
  active boolean not null default true,
  image_url text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  id integer primary key default 1 check (id = 1),
  store_name text not null default 'Step in Style',
  tagline text not null default 'Useful finds. Better prices. Delivered in style.',
  phone text not null default '0719141519',
  whatsapp text not null default '94719141519',
  email text not null default 'hello@stepinstyle.lk',
  currency text not null default 'LKR',
  delivery_text text not null default 'Islandwide Delivery • Cash on Delivery',
  meta_pixel text not null default '',
  tiktok_pixel text not null default '',
  ga4 text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.store_settings(id) values (1) on conflict (id) do nothing;

-- ---------- ADMIN HELPER ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

-- ---------- CUSTOMER ORDER RPC ----------
-- Customer only sends product IDs + quantities. Prices and private supplier
-- costs are looked up securely on the server, preventing price tampering.
create or replace function public.place_order(p_customer jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id text;
  v_total numeric(12,2) := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_supplier public.product_supplier_private%rowtype;
  v_qty integer;
  v_phone text;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then
    raise exception 'Invalid order items';
  end if;

  if coalesce(trim(p_customer->>'name'),'') = '' or coalesce(trim(p_customer->>'phone'),'') = '' or coalesce(trim(p_customer->>'address'),'') = '' or coalesce(trim(p_customer->>'district'),'') = '' then
    raise exception 'Missing required customer details';
  end if;

  v_order_id := 'SIS-' || to_char(now(), 'YYMMDD') || '-' || lpad(nextval('public.step_in_style_order_seq')::text, 5, '0');

  insert into public.orders(id, customer, subtotal, total, status, source)
  values (v_order_id, p_customer, 0, 0, 'new', 'Website');

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := greatest(1, least(50, coalesce((v_item->>'qty')::integer, 1)));

    select * into v_product
    from public.products
    where id = v_item->>'productId' and status = 'published' and stock <> 'out'
    for share;

    if not found then
      raise exception 'A selected product is unavailable';
    end if;

    if v_product.qty is not null and v_product.qty < v_qty then
      raise exception 'Insufficient quantity for %', v_product.name;
    end if;

    select * into v_supplier
    from public.product_supplier_private
    where product_id = v_product.id;

    insert into public.order_items(
      order_id, product_id, name, qty, price,
      supplier_cost, shipping, other_cost, ad_cost,
      supplier_code, supplier_url
    ) values (
      v_order_id, v_product.id, v_product.name, v_qty, v_product.price,
      coalesce(v_supplier.supplier_cost,0), coalesce(v_supplier.shipping,0),
      coalesce(v_supplier.other_cost,0), coalesce(v_supplier.ad_cost,0),
      coalesce(v_supplier.supplier_code,''), coalesce(v_supplier.supplier_url,'')
    );

    v_total := v_total + (v_product.price * v_qty);
  end loop;

  update public.orders set subtotal = v_total, total = v_total, updated_at = now() where id = v_order_id;

  v_phone := regexp_replace(coalesce(p_customer->>'phone',''), '[^0-9]', '', 'g');
  if v_phone <> '' then
    insert into public.customers(name, phone, email, orders_count, last_order_at)
    values (
      coalesce(p_customer->>'name',''),
      v_phone,
      coalesce(p_customer->>'email',''),
      1,
      now()
    )
    on conflict (phone) do update set
      name = excluded.name,
      email = case when excluded.email <> '' then excluded.email else public.customers.email end,
      orders_count = public.customers.orders_count + 1,
      last_order_at = now();
  end if;

  return jsonb_build_object('orderNumber', v_order_id, 'total', v_total);
exception when others then
  delete from public.orders where id = v_order_id;
  raise;
end;
$$;

-- ---------- REVIEW RPC ----------
create or replace function public.submit_review(
  p_product_id text,
  p_name text,
  p_phone text,
  p_rating integer,
  p_text text,
  p_media jsonb default '{"images":[],"videos":[]}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := gen_random_uuid()::text;
  v_verified boolean := false;
  v_phone text := regexp_replace(coalesce(p_phone,''), '[^0-9]', '', 'g');
begin
  if p_rating < 1 or p_rating > 5 then raise exception 'Rating must be from 1 to 5'; end if;
  if coalesce(trim(p_name),'') = '' or coalesce(trim(p_text),'') = '' then raise exception 'Name and review are required'; end if;
  if not exists(select 1 from public.products where id=p_product_id and status='published') then raise exception 'Product not found'; end if;

  if v_phone <> '' then
    select exists(
      select 1
      from public.orders o
      join public.order_items i on i.order_id=o.id
      where o.status='delivered'
        and regexp_replace(coalesce(o.customer->>'phone',''), '[^0-9]', '', 'g') = v_phone
        and i.product_id=p_product_id
    ) into v_verified;
  end if;

  insert into public.reviews(id, product_id, customer_id, customer_name, phone, rating, review_text, status, verified, media)
  values (v_id, p_product_id, auth.uid(), p_name, coalesce(p_phone,''), p_rating, p_text, 'pending', v_verified, coalesce(p_media,'{"images":[],"videos":[]}'::jsonb));
  return v_id;
end;
$$;

create or replace function public.increment_product_view(p_product_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.products set views = views + 1 where id = p_product_id and status='published';
$$;

-- ---------- ROW LEVEL SECURITY ----------
alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_supplier_private enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.customers enable row level security;
alter table public.reviews enable row level security;
alter table public.expenses enable row level security;
alter table public.offers enable row level security;
alter table public.banners enable row level security;
alter table public.store_settings enable row level security;

-- Drop policies first so this setup file can be safely re-run.
drop policy if exists "public read categories" on public.categories;
drop policy if exists "public read published products" on public.products;
drop policy if exists "public read approved reviews" on public.reviews;
drop policy if exists "public read active offers" on public.offers;
drop policy if exists "public read active banners" on public.banners;
drop policy if exists "public read store settings" on public.store_settings;
drop policy if exists "admin categories all" on public.categories;
drop policy if exists "admin products all" on public.products;
drop policy if exists "admin supplier all" on public.product_supplier_private;
drop policy if exists "admin orders all" on public.orders;
drop policy if exists "admin order items all" on public.order_items;
drop policy if exists "admin customers all" on public.customers;
drop policy if exists "admin reviews all" on public.reviews;
drop policy if exists "admin expenses all" on public.expenses;
drop policy if exists "admin offers all" on public.offers;
drop policy if exists "admin banners all" on public.banners;
drop policy if exists "admin settings all" on public.store_settings;
drop policy if exists "admin_users can read self" on public.admin_users;

-- Public reads
create policy "public read categories" on public.categories for select using (true);
create policy "public read published products" on public.products for select using (status='published' or public.is_admin());
create policy "public read approved reviews" on public.reviews for select using (status='approved' or public.is_admin());
create policy "public read active offers" on public.offers for select using (active=true or public.is_admin());
create policy "public read active banners" on public.banners for select using (active=true or public.is_admin());
create policy "public read store settings" on public.store_settings for select using (true);

-- Admin full access
create policy "admin categories all" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "admin products all" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "admin supplier all" on public.product_supplier_private for all using (public.is_admin()) with check (public.is_admin());
create policy "admin orders all" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "admin order items all" on public.order_items for all using (public.is_admin()) with check (public.is_admin());
create policy "admin customers all" on public.customers for all using (public.is_admin()) with check (public.is_admin());
create policy "admin reviews all" on public.reviews for all using (public.is_admin()) with check (public.is_admin());
create policy "admin expenses all" on public.expenses for all using (public.is_admin()) with check (public.is_admin());
create policy "admin offers all" on public.offers for all using (public.is_admin()) with check (public.is_admin());
create policy "admin banners all" on public.banners for all using (public.is_admin()) with check (public.is_admin());
create policy "admin settings all" on public.store_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "admin_users can read self" on public.admin_users for select using (user_id=auth.uid() or public.is_admin());

-- RPC permissions
revoke all on function public.place_order(jsonb,jsonb) from public;
grant execute on function public.place_order(jsonb,jsonb) to anon, authenticated;
revoke all on function public.submit_review(text,text,text,integer,text,jsonb) from public;
grant execute on function public.submit_review(text,text,text,integer,text,jsonb) to anon, authenticated;
revoke all on function public.increment_product_view(text) from public;
grant execute on function public.increment_product_view(text) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- Data API privileges. RLS policies above still decide which rows/actions are allowed.
grant usage on schema public to anon, authenticated;
revoke all on public.admin_users, public.product_supplier_private, public.orders, public.order_items, public.customers, public.expenses from anon;
grant select on public.categories, public.products, public.reviews, public.offers, public.banners, public.store_settings to anon, authenticated;
grant select, insert, update, delete on public.admin_users, public.categories, public.products, public.product_supplier_private, public.orders, public.order_items, public.customers, public.reviews, public.expenses, public.offers, public.banners, public.store_settings to authenticated;

-- ---------- STORAGE BUCKETS ----------
-- Product/description media are public for fast ecommerce display.
-- Review media is also public-read, but only approved review records are shown
-- by the website. Anonymous uploads are restricted to the submissions folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images','product-images',true,8388608,array['image/jpeg','image/png','image/webp','image/gif']),
  ('product-videos','product-videos',true,52428800,array['video/mp4','video/webm']),
  ('description-media','description-media',true,52428800,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']),
  ('review-media','review-media',true,26214400,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

-- Storage policies
drop policy if exists "public read Step in Style media" on storage.objects;
drop policy if exists "admin upload product media" on storage.objects;
drop policy if exists "admin update product media" on storage.objects;
drop policy if exists "admin delete media" on storage.objects;
drop policy if exists "customers upload review submissions" on storage.objects;
create policy "public read Step in Style media"
on storage.objects for select
using (bucket_id in ('product-images','product-videos','description-media','review-media'));

create policy "admin upload product media"
on storage.objects for insert to authenticated
with check (bucket_id in ('product-images','product-videos','description-media') and public.is_admin());
create policy "admin update product media"
on storage.objects for update to authenticated
using (bucket_id in ('product-images','product-videos','description-media') and public.is_admin())
with check (bucket_id in ('product-images','product-videos','description-media') and public.is_admin());
create policy "admin delete media"
on storage.objects for delete to authenticated
using (bucket_id in ('product-images','product-videos','description-media','review-media') and public.is_admin());

create policy "customers upload review submissions"
on storage.objects for insert to anon, authenticated
with check (
  bucket_id='review-media'
  and (storage.foldername(name))[1]='submissions'
);

-- ================================================================
-- AFTER RUNNING THIS SQL:
-- 1) Supabase Dashboard → Authentication → Users → Add user.
--    Create your admin email/password (for example your real email).
-- 2) Run this separately, replacing YOUR_ADMIN_EMAIL:
--
-- insert into public.admin_users(user_id, name, role)
-- select id, 'Step in Style Admin', 'super_admin'
-- from auth.users
-- where email = 'YOUR_ADMIN_EMAIL'
-- on conflict (user_id) do update set role='super_admin';
--
-- 3) Put Project URL + Publishable/Anon key into config.js.
-- ================================================================
