-- FlashDevis : schéma de la base Supabase (version 2).
-- Chaque artisan ne voit que ses données (Row Level Security). Le client signe par un lien secret, sans compte.

create extension if not exists pgcrypto;

-- ===== Entreprise de l'artisan (une ligne par compte) =====
create table public.entreprises (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nom text not null default '',
  metier text not null default '',
  siret text not null default '',
  adresse text not null default '',
  email text not null default '',
  telephone text not null default '',
  regime_tva text not null default 'normal' check (regime_tva in ('normal', 'franchise')),
  numero_tva text not null default '',
  assurance text not null default '',
  validite_jours int not null default 30 check (validite_jours between 1 and 365),
  conditions_paiement text not null default 'Paiement à réception de facture, par virement.',
  acompte_pct numeric(5,2) not null default 30 check (acompte_pct between 0 and 100),
  -- abonnement : modifié uniquement par le serveur (webhook Stripe), jamais par l'appli
  plan text not null default 'gratuit' check (plan in ('gratuit', 'pro')),
  stripe_customer_id text unique,
  abonnement_statut text,
  abonnement_fin timestamptz,
  cree_le timestamptz not null default now()
);

-- ===== Tarifs mémorisés =====
create table public.tarifs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  designation text not null check (length(designation) between 1 and 200),
  unite text not null default 'u' check (length(unite) <= 20),
  prix_ht numeric(12,2) not null check (prix_ht >= 0),
  maj_le timestamptz not null default now()
);
create unique index tarifs_unique on public.tarifs (user_id, lower(designation));

-- ===== Devis et factures =====
create table public.devis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  numero text not null,
  titre text not null default 'Devis',
  client jsonb not null default '{}'::jsonb,       -- { nom, adresse, email, telephone }
  lignes jsonb not null default '[]'::jsonb,       -- [{ id, designation, quantite, unite, prixUnitaireHt, tauxTva, estimation }]
  remarques text not null default '',
  statut text not null default 'brouillon' check (statut in ('brouillon', 'envoye', 'signe', 'refuse', 'facture')),
  jeton_signature uuid not null default gen_random_uuid() unique,  -- lien secret envoyé au client
  signature jsonb,                                  -- { nom, date, image }
  facture jsonb,                                    -- { numero, date, payee }
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  unique (user_id, numero),
  check (jsonb_typeof(lignes) = 'array' and jsonb_array_length(lignes) <= 200),
  check (signature is null or length(signature->>'image') <= 300000)
);
create index devis_par_artisan on public.devis (user_id, cree_le desc);

-- ===== Numérotation chronologique et sans trou, par artisan, type et année =====
create table public.numerotation (
  user_id uuid not null references auth.users (id) on delete cascade,
  prefixe text not null check (prefixe in ('D', 'F')),
  annee int not null,
  dernier int not null default 0,
  primary key (user_id, prefixe, annee)
);

create or replace function public.prochain_numero(p_user uuid, p_prefixe text)
returns text language plpgsql security definer set search_path = public as $$
declare a int := extract(year from now() at time zone 'Europe/Paris'); n int;
begin
  insert into numerotation (user_id, prefixe, annee, dernier) values (p_user, p_prefixe, a, 1)
  on conflict (user_id, prefixe, annee) do update set dernier = numerotation.dernier + 1   -- verrou de ligne : pas de doublon même en parallèle
  returning dernier into n;
  return format('%s-%s-%s', p_prefixe, a, lpad(n::text, 4, '0'));
end $$;
revoke all on function public.prochain_numero(uuid, text) from public, anon, authenticated;

-- ===== Règles à la création et à la modification d'un devis =====
create or replace function public.avant_devis()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_plan text; v_nb int;
begin
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();                      -- impossible de créer un devis pour quelqu'un d'autre
    select plan into v_plan from entreprises where user_id = new.user_id;
    if coalesce(v_plan, 'gratuit') = 'gratuit' then  -- offre gratuite : 3 devis par mois
      select count(*) into v_nb from devis where user_id = new.user_id and cree_le >= date_trunc('month', now() at time zone 'Europe/Paris');
      if v_nb >= 3 then raise exception 'QUOTA_GRATUIT' using hint = 'Passez à l’offre Pro pour des devis illimités.'; end if;
    end if;
    new.numero := prochain_numero(new.user_id, 'D');
    new.jeton_signature := gen_random_uuid();
    new.signature := null; new.facture := null;
    if new.statut not in ('brouillon', 'envoye') then new.statut := 'brouillon'; end if;
  else
    new.user_id := old.user_id; new.numero := old.numero; new.jeton_signature := old.jeton_signature; new.cree_le := old.cree_le;
    if coalesce(current_setting('flashdevis.signature_client', true), '') <> 'oui' then
      new.signature := old.signature;               -- seule la fonction signer_devis (lien du client) peut la remplir
    end if;
    if old.facture is not null then                 -- une facture émise ne se modifie plus, sauf son statut de paiement
      new.lignes := old.lignes; new.client := old.client; new.titre := old.titre;
      new.facture := jsonb_set(old.facture, '{payee}', coalesce(new.facture->'payee', old.facture->'payee'));
      new.statut := 'facture';
    elsif new.facture is not null or new.statut = 'facture' then
      if coalesce(current_setting('flashdevis.facturation', true), '') <> 'oui' then
        raise exception 'Utilisez la fonction facturer_devis pour émettre une facture.';
      end if;
    end if;
    new.maj_le := now();
  end if;
  return new;
end $$;
create trigger avant_devis before insert or update on public.devis for each row execute function public.avant_devis();

-- Émet la facture d'un devis signé, avec son numéro définitif
create or replace function public.facturer_devis(p_devis uuid)
returns public.devis language plpgsql security definer set search_path = public as $$
declare d devis;
begin
  select * into d from devis where id = p_devis and user_id = auth.uid() for update;
  if not found then raise exception 'Devis introuvable'; end if;
  if d.facture is not null then return d; end if;
  if d.statut <> 'signe' then raise exception 'Le devis doit être signé avant d’être facturé.'; end if;
  perform set_config('flashdevis.facturation', 'oui', true);
  update devis set facture = jsonb_build_object('numero', prochain_numero(d.user_id, 'F'), 'date', now(), 'payee', false), statut = 'facture', maj_le = now()
  where id = d.id returning * into d;
  return d;
end $$;

-- ===== Signature à distance, sans compte : le client n'accède qu'au devis de son lien =====
create or replace function public.devis_public(p_jeton uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'numero', d.numero, 'titre', d.titre, 'lignes', d.lignes, 'statut', d.statut, 'cree_le', d.cree_le,
    'client', jsonb_build_object('nom', d.client->>'nom'),
    'signature', case when d.signature is null then null else jsonb_build_object('nom', d.signature->>'nom', 'date', d.signature->>'date') end,
    'entreprise', jsonb_build_object('nom', e.nom, 'metier', e.metier, 'regime_tva', e.regime_tva, 'validite_jours', e.validite_jours, 'acompte_pct', e.acompte_pct))
  from devis d left join entreprises e on e.user_id = d.user_id
  where d.jeton_signature = p_jeton and d.statut in ('envoye', 'signe');
$$;

create or replace function public.signer_devis(p_jeton uuid, p_nom text, p_image text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if length(trim(p_nom)) not between 2 and 120 or p_image not like 'data:image/png;base64,%' or length(p_image) > 300000 then
    raise exception 'Signature invalide';
  end if;
  perform set_config('flashdevis.signature_client', 'oui', true);   -- autorise le déclencheur à enregistrer la signature, pour cette transaction seulement
  update devis set signature = jsonb_build_object('nom', trim(p_nom), 'date', now(), 'image', p_image), statut = 'signe', maj_le = now()
  where jeton_signature = p_jeton and statut = 'envoye' and signature is null;
  return found;
end $$;

grant execute on function public.devis_public(uuid) to anon, authenticated;
grant execute on function public.signer_devis(uuid, text, text) to anon, authenticated;
grant execute on function public.facturer_devis(uuid) to authenticated;

-- ===== Création automatique de la fiche entreprise à l'inscription =====
create or replace function public.nouvel_artisan()
returns trigger language plpgsql security definer set search_path = public as $$
begin insert into entreprises (user_id, email) values (new.id, coalesce(new.email, '')) on conflict do nothing; return new; end $$;
create trigger nouvel_artisan after insert on auth.users for each row execute function public.nouvel_artisan();

-- ===== Row Level Security =====
alter table public.entreprises enable row level security;
alter table public.tarifs enable row level security;
alter table public.devis enable row level security;
alter table public.numerotation enable row level security;   -- aucune politique : accessible seulement via prochain_numero

create policy "artisan lit son entreprise" on public.entreprises for select using (user_id = auth.uid());
create policy "artisan modifie son entreprise" on public.entreprises for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- l'appli ne peut pas changer son propre abonnement
revoke update on public.entreprises from authenticated;
grant update (nom, metier, siret, adresse, email, telephone, regime_tva, numero_tva, assurance, validite_jours, conditions_paiement, acompte_pct) on public.entreprises to authenticated;

create policy "artisan gère ses tarifs" on public.tarifs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "artisan lit ses devis" on public.devis for select using (user_id = auth.uid());
create policy "artisan crée ses devis" on public.devis for insert with check (user_id = auth.uid());
create policy "artisan modifie ses devis" on public.devis for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- une facture émise doit être conservée : on ne supprime que les devis non facturés
create policy "artisan supprime ses devis non facturés" on public.devis for delete using (user_id = auth.uid() and facture is null);
