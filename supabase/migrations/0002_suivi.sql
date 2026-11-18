-- FlashDevis : suivi des devis (refonte de l'interface).
-- Date d'envoi, date de paiement et ouvertures du lien de signature, tenues par la base : l'appli ne peut pas les falsifier.
-- À coller dans le SQL Editor de Supabase après 0001_schema.sql. Sans ce script, l'appli fonctionne (elle se base sur la date de création).

alter table public.devis
  add column if not exists envoye_le timestamptz,
  add column if not exists payee_le timestamptz,
  add column if not exists ouvertures int not null default 0,
  add column if not exists ouvert_le timestamptz;

-- Mêmes règles qu'en 0001, plus le remplissage automatique des dates de suivi
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
    new.envoye_le := case when new.statut = 'envoye' then now() end;
    new.payee_le := null; new.ouvertures := 0; new.ouvert_le := null;
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
    -- suivi : première date d'envoi conservée, date de paiement posée quand la facture passe à payée
    new.envoye_le := coalesce(old.envoye_le, case when new.statut = 'envoye' then now() end);
    new.payee_le := case when coalesce((new.facture->>'payee')::boolean, false) then coalesce(old.payee_le, now()) end;
    if coalesce(current_setting('flashdevis.ouverture', true), '') <> 'oui' then
      new.ouvertures := old.ouvertures; new.ouvert_le := old.ouvert_le;   -- seule noter_ouverture les change
    end if;
    new.maj_le := now();
  end if;
  return new;
end $$;

-- Le client ouvre son lien : on le compte (sauf si c'est l'artisan lui-même qui regarde)
create or replace function public.noter_ouverture(p_jeton uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('flashdevis.ouverture', 'oui', true);
  update devis set ouvertures = ouvertures + 1, ouvert_le = now()
  where jeton_signature = p_jeton and statut in ('envoye', 'signe') and user_id is distinct from auth.uid();
end $$;
grant execute on function public.noter_ouverture(uuid) to anon, authenticated;

-- Devis existants : date d'envoi approximée par la date de création, paiement par la date de facture (déclencheur suspendu le temps de la reprise)
alter table public.devis disable trigger avant_devis;
update public.devis set envoye_le = cree_le where envoye_le is null and statut in ('envoye', 'signe', 'refuse', 'facture');
update public.devis set payee_le = (facture->>'date')::timestamptz where payee_le is null and coalesce((facture->>'payee')::boolean, false);
alter table public.devis enable trigger avant_devis;
