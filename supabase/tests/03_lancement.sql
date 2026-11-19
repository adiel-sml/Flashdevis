-- Tests de 0003, dans une nouvelle session après 0003_lancement.sql
\set ON_ERROR_STOP 0
\pset tuples_only on
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false); set role authenticated;
update entreprises set logo = 'data:image/png;base64,iVBORw0KGgo=' where true; select 'L1 logo accepté : ' || count(*) from entreprises where logo is not null;
update entreprises set logo = 'javascript:alert(1)' where true;   -- doit échouer
select 'L2 logo invalide refusé : ' || (logo like 'data:%')::text from entreprises;
select 'G1 20 rédactions acceptées : ' || count(*) filter (where ok) from (select consommer_generation() ok from generate_series(1, 21)) x;
select 'G2 la 22e est refusée : ' || (not consommer_generation())::text;
select 'G3 table invisible pour l''artisan : ' || count(*) from generations;
reset role; select set_config('request.jwt.claim.sub','', false); set role anon;
select consommer_generation();   -- doit échouer : réservé aux comptes connectés
