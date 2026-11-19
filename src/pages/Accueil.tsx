import { PiedLegal } from './Legal';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Cadre';

const etapes = [
  ['1', 'Dictez le chantier', 'Sur place, au téléphone : « salle de bain 6 m², dépose du carrelage, faïence fournie et posée… »'],
  ['2', 'Le devis s’écrit tout seul', 'Lignes, quantités, unités, TVA et mentions obligatoires, avec vos propres tarifs.'],
  ['3', 'Votre client signe en ligne', 'Il reçoit un lien, signe sur son téléphone. Vous transformez en facture en un clic.'],
];
const atouts = [
  ['Vos prix, pas ceux d’un autre', 'FlashDevis retient vos tarifs à chaque devis et les réutilise.'],
  ['Conforme', 'SIRET, TVA ou franchise, validité, assurance, pénalités de retard : tout y est.'],
  ['Relances sans gêne', 'Un clic pour relancer une facture impayée, poliment.'],
  ['Prêt pour 2027', 'La facture électronique devient obligatoire pour les TPE et micro-entreprises au 1er septembre 2027.'],
];

export default function Accueil() {
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Logo />
        <Link to="/app" className="btn-secondaire">Se connecter</Link>
      </header>
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-10 text-center sm:pt-16">
        <p className="mx-auto mb-4 inline-block rounded-full bg-flash-100 px-3 py-1 text-sm font-semibold text-encre-800">Pour les artisans et indépendants</p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">Votre devis prêt <span className="text-flash-500">avant de quitter le chantier</span>.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">Dictez, FlashDevis rédige. Devis conformes, signature en ligne, factures et relances, depuis votre téléphone.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/app/nouveau" className="btn-primaire px-6 py-3 text-base">⚡ Faire un devis gratuit</Link>
          <a href="#tarifs" className="btn-secondaire px-6 py-3 text-base">Voir les tarifs</a>
        </div>
        <p className="mt-3 text-sm text-slate-500">Sans carte bancaire · 3 devis offerts chaque mois</p>
      </section>
      <section className="bg-slate-50 py-14">
        <div className="mx-auto grid max-w-5xl gap-4 px-4 sm:grid-cols-3">
          {etapes.map(([n, t, d]) => <div key={n} className="carte"><span className="grid h-9 w-9 place-items-center rounded-full bg-encre-900 font-bold text-flash-400">{n}</span><h2 className="mt-3 text-lg font-bold">{t}</h2><p className="mt-1 text-slate-600">{d}</p></div>)}
        </div>
      </section>
      <section className="mx-auto grid max-w-5xl gap-4 px-4 py-14 sm:grid-cols-2">
        {atouts.map(([t, d]) => <div key={t} className="rounded-2xl border border-slate-200 p-5"><h3 className="font-bold">{t}</h3><p className="mt-1 text-slate-600">{d}</p></div>)}
      </section>
      <section id="tarifs" className="bg-encre-900 py-14 text-white">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-3xl font-extrabold">Un prix simple</h2>
          <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/15 p-6"><p className="font-semibold text-slate-300">Découverte</p><p className="mt-2 text-4xl font-extrabold">0 €</p><ul className="mt-4 space-y-2 text-slate-300"><li>3 devis par mois</li><li>PDF conformes</li><li>Signature en ligne</li></ul></div>
            <div className="rounded-2xl border-2 border-flash-500 bg-white/5 p-6"><p className="font-semibold text-flash-400">Pro</p><p className="mt-2 text-4xl font-extrabold">12 €<span className="text-base font-medium text-slate-300"> HT / mois</span></p><ul className="mt-4 space-y-2 text-slate-200"><li>Devis et factures illimités</li><li>Dictée et tarifs mémorisés</li><li>Relances des impayés</li><li>14 jours d’essai, sans engagement</li></ul></div>
          </div>
          <div className="mt-8 text-center"><Link to="/app/nouveau" className="btn-primaire px-6 py-3 text-base">Commencer gratuitement</Link></div>
        </div>
      </section>
      <PiedLegal />
    </div>
  );
}
