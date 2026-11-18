-- Tests du suivi (0002). Lancer dans une nouvelle session après 01_regles.sql et la migration 0002 : psql -f ../migrations/0002_suivi.sql, puis psql -f 02_suivi.sql
\set ON_ERROR_STOP 0
\pset tuples_only on
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false); set role authenticated;
select 'S1 date d''envoi posée pour les devis envoyés : ' || count(*) filter (where envoye_le is not null) || '/' || count(*) filter (where statut <> 'brouillon') from devis;
update devis set ouvertures = 99 where true; select 'S2 ouvertures forgées par l''artisan (0 attendu) : ' || max(ouvertures) from devis;
update devis set envoye_le = '2000-01-01' where true; select 'S3 date d''envoi forgée (0 attendu) : ' || count(*) from devis where envoye_le = '2000-01-01';
update devis set statut = 'envoye' where numero = 'D-2026-0004';
reset role; select set_config('flashdevis.j', (select jeton_signature::text from devis where numero = 'D-2026-0004'), false);
select set_config('request.jwt.claim.sub','', false); set role anon;
select noter_ouverture(current_setting('flashdevis.j')::uuid); select noter_ouverture(current_setting('flashdevis.j')::uuid);
reset role; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false); set role authenticated;
select noter_ouverture(current_setting('flashdevis.j')::uuid);
reset role; select 'S4 ouvertures du lien (2 attendues, l''artisan ne compte pas) : ' || ouvertures from devis where numero = 'D-2026-0004';
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false); set role authenticated;
update devis set facture = jsonb_set(facture, '{payee}', 'true') where facture is not null;
select 'S5 date de paiement posée : ' || count(*) from devis where payee_le is not null;
