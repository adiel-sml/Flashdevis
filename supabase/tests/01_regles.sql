-- Tests de sécurité et des règles métier. Lancer : psql -f 00_simulation_supabase.sql -f ../migrations/0001_schema.sql -f 01_regles.sql
\set ON_ERROR_STOP 0
\pset tuples_only on
insert into auth.users values ('11111111-1111-1111-1111-111111111111','a@x.fr'), ('22222222-2222-2222-2222-222222222222','b@x.fr');
select 'T1 fiches entreprise créées : ' || count(*) from entreprises;
-- artisan A
set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false);
update entreprises set nom = 'Martin Rénovation' where true;
update entreprises set plan = 'pro';   -- doit échouer (colonne protégée)
insert into devis (titre, lignes, statut, user_id) values ('D1','[]','facture','22222222-2222-2222-2222-222222222222');
insert into devis (titre) values ('D2'); insert into devis (titre) values ('D3');
insert into devis (titre) values ('D4');  -- doit échouer : quota gratuit
select 'T2 numéros A : ' || string_agg(numero || '/' || statut || '/' || (user_id = auth.uid())::text, ', ' order by numero) from devis;
-- artisan B ne voit rien de A
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', false);
select 'T3 devis visibles par B : ' || count(*) from devis;
update devis set titre = 'piraté'; select 'T3b lignes modifiées par B : ' || count(*) from devis where titre = 'piraté';
insert into tarifs (designation, prix_ht) values ('Pose', 40);
select 'T4 tarifs de B : ' || count(*) from tarifs;
-- A envoie D1, le client signe avec le jeton
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false);
update devis set statut = 'envoye' where numero like 'D-%-0001';
update devis set signature = '{"nom":"faux","image":"x"}' where numero like 'D-%-0001';
select 'T5 signature forgée par l artisan : ' || coalesce(signature->>'nom','aucune') from devis where numero like 'D-%-0001';
select set_config('flashdevis.jeton', (select jeton_signature::text from devis where numero like 'D-%-0001'), false);
reset role; set role anon; select set_config('request.jwt.claim.sub','', false);
select 'T6 vue publique : ' || (devis_public(current_setting('flashdevis.jeton')::uuid) - 'lignes')::text;
select 'T6b jeton inconnu : ' || coalesce(devis_public(gen_random_uuid())::text, 'null');
select 'T7 signature client : ' || signer_devis(current_setting('flashdevis.jeton')::uuid, 'Sophie Bernard', 'data:image/png;base64,AAAA');
select 'T7b seconde signature : ' || signer_devis(current_setting('flashdevis.jeton')::uuid, 'Autre', 'data:image/png;base64,BBBB');
select 'T7c anon lit la table devis : ' || count(*) from devis;
reset role; set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false);
select 'T8 après signature : ' || statut || ' / ' || (signature->>'nom') from devis where numero like 'D-%-0001';
set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false);
update devis set statut = 'signe' where numero = 'D-2026-0002';   -- signé sur papier
select 'T9 facture émise : ' || (f.facture->>'numero') from devis d, lateral facturer_devis(d.id) f where d.numero = 'D-2026-0002';
select 'T9b refus si non signé : ' || coalesce((select (facturer_devis(id)).statut from devis where numero = 'D-2026-0099'), 'pas de devis');
update devis set titre = 'modifié', facture = jsonb_set(facture, '{payee}', 'true') where numero = 'D-2026-0002';
select 'T10 facture figée : ' || titre || ' / payée=' || (facture->>'payee') from devis where numero = 'D-2026-0002';
delete from devis where numero = 'D-2026-0002'; select 'T11 facture conservée : ' || count(*) from devis where numero = 'D-2026-0002';
reset role; update entreprises set plan = 'pro' where user_id = '11111111-1111-1111-1111-111111111111';
set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false);
insert into devis (titre) values ('Pro 1'); select 'T12 Pro sans quota, nouveau numéro : ' || max(numero) from devis;
