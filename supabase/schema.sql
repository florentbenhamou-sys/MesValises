-- MesValises — schéma Supabase (Postgres)
--
-- À exécuter une fois dans l'éditeur SQL de votre projet Supabase
-- (Dashboard > SQL Editor > New query > coller > Run).
--
-- Prérequis côté projet Supabase : activer les connexions anonymes
-- (Authentication > Providers > Anonymous sign-ins > Enable).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  birthdate date,
  height_cm int,
  color text not null default '#4f7cff',
  created_at timestamptz not null default now()
);

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  destination text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create table if not exists luggages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  name text not null,
  kind text not null default 'valise' check (kind in ('valise', 'cabine', 'sac', 'autre')),
  owner_person_id uuid references people(id) on delete set null,
  max_weight_kg numeric,
  created_at timestamptz not null default now()
);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  luggage_id uuid references luggages(id) on delete set null,
  name text not null,
  category text not null default 'autre',
  quantity int not null default 1,
  unit_weight_g int,
  packed boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Fonctions (security definer : contournent volontairement la RLS pour
-- gérer la création/adhésion à un foyer, seule opération qui doit se faire
-- avant que l'utilisateur soit membre de quoi que ce soit).
-- ---------------------------------------------------------------------------

create or replace function is_household_member(p_household_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from household_members
    where household_id = p_household_id and user_id = auth.uid()
  );
$$;

create or replace function create_household(p_name text, p_display_name text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_household_id uuid;
  v_code text;
begin
  loop
    v_code := upper(substr(md5(random()::text), 1, 6));
    exit when not exists (select 1 from households where code = v_code);
  end loop;

  insert into households (code, name) values (v_code, p_name)
  returning id into v_household_id;

  insert into household_members (household_id, user_id, display_name)
  values (v_household_id, auth.uid(), p_display_name);

  return v_household_id;
end;
$$;

create or replace function join_household(p_code text, p_display_name text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_household_id uuid;
begin
  select id into v_household_id from households where code = upper(p_code);
  if v_household_id is null then
    raise exception 'Code famille introuvable';
  end if;

  insert into household_members (household_id, user_id, display_name)
  values (v_household_id, auth.uid(), p_display_name)
  on conflict (household_id, user_id) do update set display_name = excluded.display_name;

  return v_household_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security : chaque table n'est visible/modifiable que par les
-- membres du foyer concerné (households/household_members ne sont écrits
-- que via les fonctions ci-dessus, jamais directement par le client).
-- ---------------------------------------------------------------------------

alter table households enable row level security;
alter table household_members enable row level security;
alter table people enable row level security;
alter table trips enable row level security;
alter table luggages enable row level security;
alter table items enable row level security;

create policy "members can read their household" on households
  for select using (is_household_member(id));

create policy "members can read their membership rows" on household_members
  for select using (is_household_member(household_id));

create policy "members can manage people" on people
  for all using (is_household_member(household_id))
  with check (is_household_member(household_id));

create policy "members can manage trips" on trips
  for all using (is_household_member(household_id))
  with check (is_household_member(household_id));

create policy "members can manage luggages" on luggages
  for all using (exists (
    select 1 from trips t where t.id = luggages.trip_id and is_household_member(t.household_id)
  ))
  with check (exists (
    select 1 from trips t where t.id = luggages.trip_id and is_household_member(t.household_id)
  ));

create policy "members can manage items" on items
  for all using (exists (
    select 1 from trips t where t.id = items.trip_id and is_household_member(t.household_id)
  ))
  with check (exists (
    select 1 from trips t where t.id = items.trip_id and is_household_member(t.household_id)
  ));

-- ---------------------------------------------------------------------------
-- Realtime : pour que les changements d'un membre du foyer apparaissent
-- en direct chez les autres (facultatif, mais recommandé pour un usage
-- familial multi-appareils).
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table people, trips, luggages, items, household_members;
