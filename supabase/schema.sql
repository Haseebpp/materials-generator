-- ============================================================
-- Materials Generator — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- 1. Materials Catalogue (migrated from materials.json)
create table if not exists materials (
  id          text primary key,
  category    text        not null,
  description text        not null,
  details     jsonb       not null default '{}',
  qty         text        not null default '',
  unit        text        not null default '',
  rate        text        not null default '',
  created_at  timestamptz not null default now()
);

-- 2. BOQ Items (replaces localStorage "boqItems")
create table if not exists boq_items (
  id          text        primary key,
  category    text        not null,
  description text        not null,
  details     jsonb       not null default '{}',
  qty         text        not null default '',
  unit        text        not null default '',
  rate        text        not null default '',
  boq_qty     integer     not null default 1,
  remarks     text        not null default '',
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 3. AI Generation History (replaces localStorage "ai_generator_history")
create table if not exists generation_history (
  id                  text        primary key,
  timestamp           timestamptz not null,
  prompt              text        not null,
  image_data_urls     text[]      not null default '{}',
  professional_items  jsonb       not null default '[]',
  standardized_items  jsonb       not null default '[]',
  api_key_used        boolean     not null default false,
  image_count         integer     not null default 0,
  professional_count  integer     not null default 0,
  standardized_count  integer     not null default 0,
  created_at          timestamptz not null default now()
);

-- ============================================================
-- Row Level Security (RLS) — public access for now (no auth)
-- You can add auth later with: auth.uid() checks
-- ============================================================

alter table materials          enable row level security;
alter table boq_items          enable row level security;
alter table generation_history enable row level security;

-- Public read/write policies (no auth required — single-user app)
create policy "public_all_materials"          on materials          for all using (true) with check (true);
create policy "public_all_boq_items"          on boq_items          for all using (true) with check (true);
create policy "public_all_generation_history" on generation_history for all using (true) with check (true);

-- ============================================================
-- Realtime — enable for live sync
-- ============================================================
alter publication supabase_realtime add table boq_items;
alter publication supabase_realtime add table generation_history;
