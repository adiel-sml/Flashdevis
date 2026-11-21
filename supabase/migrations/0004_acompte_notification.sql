-- FlashDevis : facture d'acompte et e-mail à l'artisan quand son client signe.
-- À coller dans le SQL Editor de Supabase après 0003_lancement.sql. On peut le relancer sans risque.

alter table public.devis
  add column if not exists acompte jsonb,                -- { numero, date, pct, payee, payee_le } : facture d'acompte, émise par facturer_acompte
  add column if not exists signature_notifiee_le timestamptz;   -- e-mail « votre client a signé » envoyé

-- Mêmes règles qu'en 0002, plus : acompte émis seulement par facturer_acompte, devis figé dès qu'un acompte est facturé
create or replace function public.avant_devis()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_plan text; v_nb int;
begin
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    select plan into v_plan from entreprises where user_id = new.user_id;
    if coalesce(v_plan, 'gratuit') = 'gratuit' then
      select count(*) into v_nb from devis where user_id = new.user_id and cree_le >= date_trunc('month', now() at time zone 'Europe/Paris');
      if v_nb >= 3 then raise exception 'QUOTA_GRATUIT' using hint = 'Passez à l’offre Pro pour des devis illimités.'; end if;
    end if;
    new.numero := prochain_numero(new.user_id, 'D');
    new.jeton_signature := gen_random_uuid();
    new.signature := null; new.facture := null; new.acompte := null; new.signature_notifiee_le := null;
    if new.statut not in ('brouillon', 'envoye') then new.statut := 'brouillon'; end if;
    new.envoye_le := case when new.statut = 'envoye' then now() end;
    new.payee_le := null; new.ouvertures := 0; new.ouvert_le := null;
  else
    new.user_id := old.user_id; new.numero := old.numero; new.jeton_signature := old.jeton_signature; new.cree_le := old.cree_le;
    if coalesce(current_setting('flashdevis.signature_client', true), '') <> 'oui' then
      new.signature := old.signature;
    end if;
    -- acompte : seule facturer_acompte le crée ; ensuite, seul son statut payé change (avec sa date)
    if coalesce(current_setting('flashdevis.acompte', true), '') <> 'oui' then
      new.acompte := case when old.acompte is null then null else
        jsonb_set(jsonb_set(old.acompte, '{payee}', coalesce(new.acompte->'payee', old.acompte->'payee')), '{payee_le}',
          case when coalesce((new.acompte->>'payee')::boolean, (old.acompte->>'payee')::boolean, false) then coalesce(nullif(old.acompte->'payee_le', 'null'::jsonb), to_jsonb(now())) else 'null'::jsonb end) end;
    end if;
    if old.facture is not null or old.acompte is not null then   -- facture ou acompte émis : le contenu du devis ne bouge plus
      new.lignes := old.lignes; new.client := old.client; new.titre := old.titre;
    end if;
    if old.facture is not null then
      new.facture := jsonb_set(old.facture, '{payee}', coalesce(new.facture->'payee', old.facture->'payee'));
      new.statut := 'facture';
    elsif new.facture is not null or new.statut = 'facture' then
      if coalesce(current_setting('flashdevis.facturation', true), '') <> 'oui' then
        raise exception 'Utilisez la fonction facturer_devis pour émettre une facture.';
      end if;
    end if;
    new.envoye_le := coalesce(old.envoye_le, case when new.statut = 'envoye' then now() end);
    new.payee_le := case when coalesce((new.facture->>'payee')::boolean, false) then coalesce(old.payee_le, now()) end;
    if coalesce(current_setting('flashdevis.ouverture', true), '') <> 'oui' then
      new.ouvertures := old.ouvertures; new.ouvert_le := old.ouvert_le;
    end if;
    if coalesce(current_setting('flashdevis.notification', true), '') <> 'oui' then
      new.signature_notifiee_le := old.signature_notifiee_le;
    end if;
    new.maj_le := now();
  end if;
  return new;
end $$;

-- Émet la facture d'acompte d'un devis signé (numéro dans la même suite que les factures)
create or replace function public.facturer_acompte(p_devis uuid, p_pct numeric)
returns public.devis language plpgsql security definer set search_path = public as $$
declare d devis;
begin
  if p_pct is null or p_pct <= 0 or p_pct >= 100 then raise exception 'Pourcentage d’acompte invalide.'; end if;
  select * into d from devis where id = p_devis and user_id = auth.uid() for update;
  if not found then raise exception 'Devis introuvable'; end if;
  if d.acompte is not null then return d; end if;
  if d.statut <> 'signe' or d.facture is not null then raise exception 'L’acompte se facture sur un devis signé, avant la facture finale.'; end if;
  perform set_config('flashdevis.acompte', 'oui', true);
  update devis set acompte = jsonb_build_object('numero', prochain_numero(d.user_id, 'F'), 'date', now(), 'pct', p_pct, 'payee', false, 'payee_le', null), maj_le = now()
  where id = d.id returning * into d;
  return d;
end $$;
grant execute on function public.facturer_acompte(uuid, numeric) to authenticated;

-- E-mail « votre client a signé » : réserve l'envoi une seule fois par devis signé (appelée par le serveur uniquement)
create or replace function public.reserver_notification_signature(p_jeton uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  perform set_config('flashdevis.notification', 'oui', true);
  update devis d set signature_notifiee_le = now()
  where d.jeton_signature = p_jeton and d.signature is not null and d.signature_notifiee_le is null
  returning jsonb_build_object('id', d.id, 'numero', d.numero, 'titre', d.titre, 'lignes', d.lignes, 'client', d.client->>'nom', 'signataire', d.signature->>'nom',
    'email', (select coalesce(nullif(e.email, ''), u.email) from entreprises e join auth.users u on u.id = e.user_id where e.user_id = d.user_id),
    'regime', (select regime_tva from entreprises e where e.user_id = d.user_id)) into r;
  return r;
end $$;
create or replace function public.liberer_notification_signature(p_jeton uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('flashdevis.notification', 'oui', true);
  update devis set signature_notifiee_le = null where jeton_signature = p_jeton;
end $$;
revoke all on function public.reserver_notification_signature(uuid) from public, anon, authenticated;
revoke all on function public.liberer_notification_signature(uuid) from public, anon, authenticated;

-- Une facture d'acompte émise doit être conservée, comme une facture : le devis ne se supprime plus
drop policy if exists "artisan supprime ses devis non facturés" on public.devis;
create policy "artisan supprime ses devis non facturés" on public.devis for delete using (user_id = auth.uid() and facture is null and acompte is null);
