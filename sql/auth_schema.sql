-- Authentication and account management schema
-- Designed for PostgreSQL / Supabase

create extension if not exists pgcrypto;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  email text not null unique,
  password_hash text not null,
  is_email_verified boolean not null default false,
  status text not null default 'active' check (status in ('active', 'suspended', 'disabled')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_users_email_lower on app_users ((lower(email)));
create index if not exists idx_app_users_username_lower on app_users ((lower(username)));

create table if not exists user_roles_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

insert into user_roles_catalog (slug, name, description)
values
  ('user', 'User', 'Default authenticated user'),
  ('admin', 'Admin', 'Administrative account with elevated access')
on conflict (slug) do nothing;

create table if not exists user_role_assignments (
  user_id uuid not null references app_users(id) on delete cascade,
  role_id uuid not null references user_roles_catalog(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table if not exists user_profiles (
  user_id uuid primary key references app_users(id) on delete cascade,
  display_name text,
  avatar_url text,
  bio text,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  session_token_hash text not null unique,
  ip_address inet,
  user_agent text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create index if not exists idx_auth_sessions_user on auth_sessions (user_id);
create index if not exists idx_auth_sessions_expires on auth_sessions (expires_at);

create table if not exists auth_one_time_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  token_hash text not null unique,
  token_type text not null check (token_type in ('email_verification', 'password_reset')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_tokens_user_type on auth_one_time_tokens (user_id, token_type);
create index if not exists idx_auth_tokens_expires on auth_one_time_tokens (expires_at);

create or replace function set_updated_at_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- triggers

drop trigger if exists trg_app_users_updated_at on app_users;
create trigger trg_app_users_updated_at
before update on app_users
for each row execute procedure set_updated_at_timestamp();
