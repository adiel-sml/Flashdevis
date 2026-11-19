-- FlashDevis : préparation du lancement.
-- Logo de l'artisan sur ses documents, et limite de rédactions par l'assistant tenue par la base (protège le crédit de l'API).
-- À coller dans le SQL Editor de Supabase après 0002_suivi.sql. On peut le relancer sans risque.

-- Logo : image réduite par l'appli (300 px au plus), stockée avec la fiche entreprise
alter table public.entreprises add column if not exists logo text;
alter table public.entreprises drop constraint if exists logo_valide;
alter table public.entreprises add constraint logo_valide check (logo is null or (logo ~ '^data:image/(png|jpeg);base64,' and length(logo) <= 200000));
grant update (logo) on public.entreprises to authenticated;

-- Rédactions par l'assistant : 20 par heure et 60 par jour et par compte
create table if not exists public.generations (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  cree_le timestamptz not null default now()
);
create index if not exists generations_par_compte on public.generations (user_id, cree_le desc);
alter table public.generations enable row level security;   -- aucune politique : accessible seulement via consommer_generation

create or replace function public.consommer_generation()
returns boolean language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); h int; j int;
begin
  if u is null then return false; end if;
  perform pg_advisory_xact_lock(hashtext(u::text));      -- deux rédactions simultanées ne passent pas toutes les deux sous la limite
  select count(*) filter (where cree_le > now() - interval '1 hour'), count(*) into h, j
  from generations where user_id = u and cree_le > now() - interval '1 day';
  if h >= 20 or j >= 60 then return false; end if;
  insert into generations (user_id) values (u);
  delete from generations where user_id = u and cree_le < now() - interval '2 days';
  return true;
end $$;
revoke all on function public.consommer_generation() from public, anon;
grant execute on function public.consommer_generation() to authenticated;
