-- Tests de 0004, dans une nouvelle session après 0004_acompte_notification.sql (sur la base des tests 01 à 03)
\set ON_ERROR_STOP 0
\pset tuples_only on
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false); set role authenticated;
update devis set acompte = '{"numero":"F-9999","pct":30}' where true;   -- forgé : ignoré
select 'A1 acompte forgé par l''artisan : ' || count(*) from devis where acompte is not null;
select facturer_acompte((select id from devis where numero = 'D-2026-0004'), 30);   -- D4 envoyé, pas signé : doit échouer
update devis set statut = 'signe' where numero = 'D-2026-0004';
select 'A2 acompte émis : ' || ((facturer_acompte((select id from devis where numero = 'D-2026-0004'), 30)).acompte->>'numero');
select 'A3 second appel, même numéro : ' || ((facturer_acompte((select id from devis where numero = 'D-2026-0004'), 30)).acompte->>'numero');
update devis set titre = 'changé', lignes = '[]' where numero = 'D-2026-0004'; select 'A4 devis figé après acompte : ' || titre from devis where numero = 'D-2026-0004';
update devis set acompte = jsonb_set(acompte, '{payee}', 'true') where numero = 'D-2026-0004';
select 'A5 acompte payé, date posée : ' || (acompte->>'payee') || ' / ' || (acompte->>'payee_le' is not null)::text from devis where numero = 'D-2026-0004';
select 'A6 facture finale après acompte : ' || ((facturer_devis((select id from devis where numero = 'D-2026-0004'))).facture->>'numero');
select reserver_notification_signature(gen_random_uuid());   -- réservé au serveur : doit échouer
reset role;
select 'N1 notification réservée une fois : ' || count(*) filter (where r is not null) from (select reserver_notification_signature(jeton_signature) r from devis where signature is not null union all select reserver_notification_signature(jeton_signature) from devis where signature is not null) x;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false); set role authenticated;
delete from devis where acompte is not null; select 'A7 devis avec acompte conservé : ' || count(*) from devis where acompte is not null;
