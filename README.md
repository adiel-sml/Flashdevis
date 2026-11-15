# FlashDevis

Le devis prêt avant de quitter le chantier. L'artisan dicte la prestation, FlashDevis rédige les lignes du devis avec ses propres tarifs, le client signe en ligne, et le devis devient une facture en un clic.

## Ce que fait la version 1

- **Devis à la voix** : dictée dans le navigateur (gratuite), puis rédaction des lignes par Claude (quantités, unités, TVA, prix).
- **Tarifs mémorisés** : chaque prix confirmé par l'artisan est réutilisé dans les devis suivants. Les prix proposés par l'assistant sont signalés comme estimations à vérifier.
- **Documents conformes** : PDF du devis et de la facture avec SIRET, TVA ou franchise (article 293 B du CGI), validité, assurance, acompte, pénalités de retard et indemnité de recouvrement.
- **Suivi** : brouillon, envoyé, signé, facturé, payé ; tableau de bord des montants en attente, signés et impayés ; relance d'un impayé par e-mail.
- **Numérotation** chronologique et sans trou (D-2026-0001, F-2026-0001).
- **Appli installable** sur téléphone, pensée pour un usage d'une main.

## Version 2 (en cours) : comptes et signature à distance

- **Comptes sans mot de passe** : connexion par lien reçu par e-mail (Supabase Auth), données synchronisées entre téléphone et ordinateur.
- **Signature à distance** : le client reçoit un lien secret, consulte le devis et signe sur son téléphone, sans compte. Il ne voit que ce devis.
- **Règles tenues par la base**, pas par l'appli : chaque artisan ne voit que ses données, numérotation sans trou même en parallèle, 3 devis par mois en offre gratuite, signature impossible à forger par l'artisan, facture émise figée (seul le statut payé change) et impossible à supprimer.
- **Génération protégée** : avec Supabase, seule une session connectée peut appeler Claude, avec une limite par compte.
- Reste à faire : abonnement Pro par Stripe (le webhook passera `entreprises.plan` à `pro`).

Sans les variables Supabase, l'appli tourne en **mode démo** : tout reste dans le navigateur, sans compte.

## Feuille de route

| Version | Contenu |
|---|---|
| 2 | Comptes et synchronisation (Supabase), signature à distance par lien, abonnement Pro avec essai de 14 jours (Stripe), limite de 3 devis par mois en offre gratuite |
| 3 | Facture électronique via une plateforme agréée (obligatoire pour les TPE et micro-entreprises au 1er septembre 2027), relances automatiques programmées, logo sur les documents |

## Architecture

```
src/            appli React + TypeScript (Vite, Tailwind)
  lib/calcul    montants, TVA par taux, acompte, numérotation (testés)
  lib/pdf       génération des PDF devis et facture (jsPDF)
  lib/dictee    reconnaissance vocale du navigateur
  lib/store     données : Supabase si configuré, sinon navigateur (mode démo)
  lib/supabase  client Supabase
supabase/
  migrations    schéma, règles de sécurité (RLS), quota, numérotation, signature
  tests         tests SQL des règles (PostgreSQL 16)
api/            fonctions serveur Vercel
  generer-devis transforme la description en lignes de devis (Claude, sortie structurée validée par Zod)
```

La clé d'API ne quitte jamais le serveur. La fonction limite la taille des descriptions et le nombre de générations par visiteur pour protéger le crédit.

## Lancer en local

```bash
npm install
npm run dev        # l'appli sur http://localhost:5173
npm test           # tests des calculs
npm run build      # version de production dans dist/
```

En local, la génération demande la fonction serveur : lancez `vercel dev` avec `ANTHROPIC_API_KEY` dans un fichier `.env.local` (jamais commité).

## Mise en ligne sur Vercel

1. **Add New**, puis **Project**, et importer ce dépôt. Le preset **Vite** est détecté.
2. Dans **Settings**, puis **Environment Variables**, ajouter `ANTHROPIC_API_KEY` (et éventuellement `FLASHDEVIS_MODEL`, par défaut `claude-haiku-5-5`).
3. **Deploy**. Chaque push sur `main` met le site à jour.

## Brancher Supabase (version 2)

1. Créer un projet sur supabase.com (région Europe, par exemple Paris ou Francfort).
2. **SQL Editor**, coller le contenu de `supabase/migrations/0001_schema.sql`, puis **Run**.
3. **Authentication**, puis **URL Configuration** : mettre l'adresse du site Vercel dans **Site URL** et ajouter `https://<votre-site>/app` dans **Redirect URLs**.
4. **Project Settings**, puis **API** : copier **Project URL** et la clé **anon public**.
5. Dans Vercel, ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, puis redéployer. La clé anon est publique par conception : la sécurité repose sur les règles de la base. Ne jamais mettre la clé `service_role` dans l'appli.

Tester les règles en local : `psql -f supabase/tests/00_simulation_supabase.sql -f supabase/migrations/0001_schema.sql -f supabase/tests/01_regles.sql` sur une base PostgreSQL 16 vide.
