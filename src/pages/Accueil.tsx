// Page publique : ce que fait FlashDevis, montré sur un vrai exemple de devis, puis les prix
import { Link } from 'react-router-dom';
import { Logo } from '../components/Cadre';
import { IcCoche, IcMicro } from '../components/Icones';
import { PiedLegal } from './Legal';

const LIGNES: [string, string, string][] = [['Dépose de l’ancien carrelage', '6 m² × 25 €', '150 €'], ['Faïence murale fournie et posée', '15 m² × 78 €', '1 170 €'], ['Remplacement du mitigeur', '1 u × 185 €', '185 €']];
const PLUS_BESOIN = [
  ['Recopier vos prix', 'Ils sont retenus à chaque devis et repris tout seuls.'],
  ['Attendre une signature papier', 'Le client signe sur son téléphone, vous êtes prévenu par e-mail.'],
  ['Oublier un impayé', 'L’accueil vous dit qui relancer, et la relance part en un geste.'],
];

function Apercu() {
  return (
    <div className="mx-auto w-full max-w-sm rounded-[28px] border border-trait bg-white p-5 shadow-[0_20px_50px_rgba(17,24,39,.12)]">
      <div className="flex items-center gap-2.5 rounded-2xl bg-papier px-3.5 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-alerte text-white"><IcMicro className="h-5 w-5" /></span>
        <p className="text-[13px] leading-snug text-encre-600">« Salle de bain de 6 m², dépose du carrelage, faïence posée sur 15 m², nouveau mitigeur. »</p>
      </div>
      <p className="mt-4 text-[13px] font-semibold text-gris">D-2026-0042 · Mme Leroy</p>
      <p className="text-lg font-extrabold leading-tight">Rénovation salle de bain</p>
      <ul className="mt-3 divide-y divide-[#f0ece4]">{LIGNES.map(([d, q, t]) => <li key={d} className="flex justify-between gap-3 py-2 text-[13px]"><span>{d}<span className="block text-xs text-gris">{q}</span></span><b>{t}</b></li>)}</ul>
      <div className="mt-1 flex justify-between border-t border-trait pt-3 text-base font-extrabold"><span>Total TTC</span><span>1 655,50 €</span></div>
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-ok-pale px-3 py-2.5 text-[13px] font-semibold text-ok"><IcCoche className="h-4 w-4" />Signé par A. Leroy, aujourd’hui à 14 h 12</div>
    </div>
  );
}

export default function Accueil() {
  return (
    <div className="min-h-screen bg-papier">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Logo />
        <Link to="/app" className="btn-secondaire">Se connecter</Link>
      </header>

      <section className="mx-auto grid max-w-5xl items-center gap-10 px-5 pb-16 pt-6 md:grid-cols-2 md:pt-14">
        <div>
          <h1 className="text-[40px] font-extrabold leading-[1.05] tracking-tight sm:text-[54px]">Le devis prêt avant de quitter le chantier.</h1>
          <p className="mt-5 max-w-md text-lg text-encre-600">Vous décrivez les travaux à voix haute. FlashDevis écrit les lignes avec vos prix, et votre client signe sur son téléphone.</p>
          <Link to="/app" className="btn-primaire btn-grand mt-8 w-full sm:w-auto sm:px-8">Essayer gratuitement</Link>
          <p className="mt-3 text-sm text-gris">3 devis par mois offerts. Sans carte bancaire.</p>
        </div>
        <Apercu />
      </section>

      <section className="border-y border-trait bg-white">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <h2 className="text-[28px] font-extrabold tracking-tight">Ce que vous n’avez plus à faire</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {PLUS_BESOIN.map(([t, d]) => <div key={t}><p className="text-lg font-extrabold">{t}</p><p className="mt-1 text-encre-600">{d}</p></div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="text-[28px] font-extrabold tracking-tight">Des documents en règle</h2>
        <p className="mt-3 max-w-2xl text-encre-600">SIRET, TVA ou franchise, assurance décennale, validité, acompte, pénalités de retard : chaque devis et chaque facture porte les mentions obligatoires. Numérotation sans trou, export pour votre comptable, et prêt pour la facture électronique de 2027.</p>
      </section>

      <section id="tarifs" className="bg-encre-900 text-white">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <h2 className="text-[28px] font-extrabold tracking-tight">Tarifs</h2>
          <div className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/15 p-6"><p className="font-semibold text-[#b9bfca]">Découverte</p><p className="mt-2 text-4xl font-extrabold">0 €</p><p className="mt-3 text-[#b9bfca]">3 devis par mois, signature en ligne, factures.</p></div>
            <div className="rounded-2xl border-2 border-flash-500 p-6"><p className="font-semibold text-flash-400">Pro</p><p className="mt-2 text-4xl font-extrabold">12 €<span className="text-base font-medium text-[#b9bfca]"> HT par mois</span></p><p className="mt-3 text-[#d6dae2]">Devis illimités. 14 jours d’essai, sans engagement.</p></div>
          </div>
          <Link to="/app" className="btn-primaire btn-grand mt-8 w-full sm:w-auto sm:px-8">Commencer</Link>
        </div>
      </section>
      <PiedLegal />
    </div>
  );
}
