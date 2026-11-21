// Pages légales : mentions légales, conditions générales (utilisation et vente), confidentialité (RGPD)
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from '../components/Cadre';
import { EDITEUR } from '../lib/editeur';

const v = (x: string) => x || 'à compléter';
const Titre = ({ children }: { children: ReactNode }) => <h2 className="mb-2 mt-8 text-lg font-extrabold">{children}</h2>;
const MAJ = '19 novembre 2026';

function Mentions() {
  return <>
    <h1 className="titre-page">Mentions légales</h1>
    <Titre>Éditeur</Titre>
    <p>{EDITEUR.nom}, {v(EDITEUR.statut)}<br />Adresse : {v(EDITEUR.adresse)}<br />{EDITEUR.siret ? `SIRET : ${EDITEUR.siret}` : `SIREN : ${EDITEUR.siren}`}<br />Contact : {v(EDITEUR.email)}<br />Directeur de la publication : {EDITEUR.nom}</p>
    <Titre>Hébergement</Titre>
    <p>Site et fonctions serveur : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.<br />Base de données et comptes : Supabase Inc., données hébergées dans la région {EDITEUR.regionDonnees}.</p>
    <Titre>Propriété intellectuelle</Titre>
    <p>Le service FlashDevis, son nom, son logo et son interface sont la propriété de l’éditeur. Les devis, factures et données saisis par les utilisateurs leur appartiennent.</p>
  </>;
}

function Conditions() {
  return <>
    <h1 className="titre-page">Conditions générales d’utilisation et de vente</h1>
    <p className="mt-1 text-sm text-gris">En vigueur au {MAJ}</p>
    <Titre>1. Le service</Titre>
    <p>FlashDevis permet aux artisans et indépendants de rédiger des devis (notamment à la voix, avec l’aide d’un assistant), de les faire signer en ligne par leurs clients, de les transformer en factures et d’en suivre le paiement. Le service est réservé aux professionnels : il est souscrit pour les besoins d’une activité professionnelle.</p>
    <Titre>2. Compte</Titre>
    <p>L’accès se fait par un lien de connexion envoyé par e-mail. L’utilisateur est responsable de l’accès à sa boîte e-mail et des informations qu’il renseigne (entreprise, SIRET, TVA, assurance). Il peut supprimer son compte à tout moment depuis Profil, puis Mes données.</p>
    <Titre>3. Offres et prix</Titre>
    <p><b>Découverte</b> : gratuite, 3 devis par mois.<br /><b>Pro</b> : 12 € HT par mois, devis et factures illimités. Le premier abonnement Pro commence par 14 jours d’essai gratuit : aucun prélèvement n’a lieu avant la fin de l’essai, et une résiliation pendant l’essai n’entraîne aucun paiement.</p>
    <p className="mt-2">Le paiement est mensuel, par carte, via Stripe. L’abonnement est sans engagement : il se résilie à tout moment depuis Profil, puis Gérer. La résiliation prend effet à la fin de la période déjà payée, sans remboursement au prorata. Une facture est émise pour chaque paiement.</p>
    <Titre>4. Responsabilité de l’utilisateur</Titre>
    <p>FlashDevis est un outil d’aide à la rédaction. L’utilisateur reste seul responsable du contenu de ses devis et factures : prestations, quantités, prix, taux de TVA et mentions. Les prix proposés par l’assistant sont des estimations signalées comme telles, à vérifier avant tout envoi. L’utilisateur reste tenu de conserver ses factures pendant la durée légale (10 ans) : il peut les exporter à tout moment.</p>
    <Titre>5. Disponibilité</Titre>
    <p>L’éditeur s’efforce de rendre le service accessible en permanence, sans garantie d’absence d’interruption (maintenance, panne d’un prestataire). Sa responsabilité est limitée aux sommes versées par l’utilisateur au cours des 12 derniers mois.</p>
    <Titre>6. Données</Titre>
    <p>Le traitement des données personnelles est décrit dans la <Link to="/confidentialite" className="underline">politique de confidentialité</Link>. Pour les données des clients qu’il saisit, l’utilisateur est responsable de traitement et l’éditeur agit comme sous-traitant.</p>
    <Titre>7. Modification et droit applicable</Titre>
    <p>Ces conditions peuvent évoluer ; l’utilisateur est informé de tout changement important avant son entrée en vigueur. Elles sont soumises au droit français. En cas de litige, une solution amiable est recherchée avant toute action devant les tribunaux compétents.</p>
  </>;
}

function Confidentialite() {
  return <>
    <h1 className="titre-page">Politique de confidentialité</h1>
    <p className="mt-1 text-sm text-gris">En vigueur au {MAJ}</p>
    <Titre>Responsable du traitement</Titre>
    <p>{EDITEUR.nom}, contact : {v(EDITEUR.email)}.</p>
    <Titre>Données traitées et pourquoi</Titre>
    <ul className="list-disc space-y-1 pl-5">
      <li><b>Compte</b> : adresse e-mail, pour la connexion. Base : exécution du contrat.</li>
      <li><b>Entreprise</b> : nom, métier, SIRET, adresse, téléphone, TVA, assurance, logo, tarifs. Pour produire des documents conformes. Base : exécution du contrat.</li>
      <li><b>Devis et factures</b>, y compris les coordonnées des clients de l’utilisateur. L’éditeur les traite pour le compte de l’utilisateur, uniquement pour fournir le service.</li>
      <li><b>Signature des clients</b> : nom, image de la signature, date, et nombre d’ouvertures du lien de signature.</li>
      <li><b>Abonnement</b> : identifiant client et statut d’abonnement chez Stripe. Les données de carte bancaire sont traitées par Stripe et ne passent jamais par FlashDevis.</li>
      <li><b>Mesure d’audience</b> : statistiques de visite anonymes, sans cookie (Vercel Web Analytics).</li>
    </ul>
    <Titre>Prestataires</Titre>
    <ul className="list-disc space-y-1 pl-5">
      <li>Supabase : base de données et connexion (région {EDITEUR.regionDonnees}).</li>
      <li>Vercel : hébergement du site et des fonctions serveur.</li>
      <li>Anthropic : rédaction des lignes de devis à partir de la description dictée ou tapée. Seule cette description est transmise, avec le métier et les tarifs ; Anthropic ne l’utilise pas pour entraîner ses modèles.</li>
      <li>Stripe : paiement de l’abonnement.</li>
      <li>Brevo : envoi des e-mails de connexion.</li>
    </ul>
    <p className="mt-2">Certains de ces prestataires sont établis aux États-Unis ; les transferts sont encadrés par les clauses contractuelles types de la Commission européenne ou le cadre de protection des données UE et États-Unis.</p>
    <Titre>Durée de conservation</Titre>
    <p>Les données sont conservées tant que le compte existe. À la suppression du compte, elles sont effacées sans délai, sauf ce que la loi impose à l’éditeur de garder (factures d’abonnement, chez Stripe).</p>
    <Titre>Vos droits</Titre>
    <p>Vous pouvez accéder à vos données, les exporter et supprimer votre compte vous-même depuis Profil, puis Mes données. Pour toute autre demande (rectification, opposition, limitation) : {v(EDITEUR.email)}. Vous pouvez aussi saisir la CNIL (cnil.fr).</p>
    <Titre>Cookies</Titre>
    <p>FlashDevis n’utilise aucun cookie publicitaire ni de suivi. Seul le stockage nécessaire à la connexion est utilisé.</p>
  </>;
}

export default function Legal() {
  const { pathname } = useLocation();
  const page = pathname === '/mentions-legales' ? <Mentions /> : pathname === '/confidentialite' ? <Confidentialite /> : <Conditions />;
  return (
    <div className="min-h-screen bg-papier">
      <header className="mx-auto max-w-2xl px-5 py-4"><Link to="/"><Logo /></Link></header>
      <main className="mx-auto max-w-2xl px-5 pb-16 text-[15px] leading-relaxed text-encre-800">{page}</main>
      <PiedLegal />
    </div>
  );
}

export const PiedLegal = () => (
  <footer className="mx-auto flex max-w-5xl flex-wrap gap-x-4 gap-y-1 px-5 py-8 text-sm text-gris">
    <span>© {new Date().getFullYear()} FlashDevis</span>
    <Link to="/mentions-legales" className="hover:underline">Mentions légales</Link>
    <Link to="/conditions" className="hover:underline">Conditions générales</Link>
    <Link to="/confidentialite" className="hover:underline">Confidentialité</Link>
  </footer>
);
