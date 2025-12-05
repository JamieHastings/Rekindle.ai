-- 001_admin_schema.sql

-- Admin role flag on profiles
alter table if exists profiles
  add column if not exists is_admin boolean default false;

-- tokens column (already exists, but ensuring it's there)
alter table if exists profiles
  add column if not exists tokens integer default 0;

-- templates table
create table if not exists message_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  storage_path text not null,
  created_at timestamptz default now(),
  created_by uuid references profiles(id) on delete set null
);

-- admin action logs
create table if not exists admin_actions (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references profiles(id) on delete set null,
  action_type text,
  details jsonb,
  created_at timestamptz default now()
);

-- small view for analytics
create or replace view admin_payments_view as
select p.id, p.user_id, p.amount_cents, p.status, p.created_at, p.token_count
from stripe_payments p
order by p.created_at desc;

-- RPC for adjusting tokens (callable by service key or Edge function)
create or replace function admin_adjust_tokens(_user_id uuid, _delta int)
returns void as $$
begin
  update profiles set tokens = coalesce(tokens,0) + _delta where id = _user_id;
  insert into admin_actions (admin_id, action_type, details) 
  values (null, 'adjust_tokens', jsonb_build_object('user', _user_id, 'delta', _delta));
end;
$$ language plpgsql security definer;

-- Enable RLS on new tables
alter table message_templates enable row level security;
alter table admin_actions enable row level security;

-- Policies for message_templates (admins can manage)
create policy "Admins can view templates" on message_templates
  for select using ((select is_admin from profiles where id = auth.uid()) = true);

create policy "Admins can insert templates" on message_templates
  for insert with check ((select is_admin from profiles where id = auth.uid()) = true);

-- Policies for admin_actions (admins can view)
create policy "Admins can view actions" on admin_actions
  for select using ((select is_admin from profiles where id = auth.uid()) = true);

-- Update existing policies to allow admins full access
drop policy if exists "Admins can view all profiles" on profiles;
create policy "Admins can view all profiles" on profiles
  for select using ((select is_admin from profiles where id = auth.uid()) = true);

drop policy if exists "Admins can view all payments" on stripe_payments;
create policy "Admins can view all payments" on stripe_payments
  for select using ((select is_admin from profiles where id = auth.uid()) = true);
