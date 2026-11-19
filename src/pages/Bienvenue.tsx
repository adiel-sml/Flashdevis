// Premier lancement : trois écrans pour que les premiers devis soient conformes dès le départ
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IcRetour } from '../components/Icones';
import { enregistrerEntreprise, useEtat } from '../lib/store';
import type { Entreprise } from '../lib/types';

const METIERS = ['Plombier chauffagiste', 'Électricien', 'Peintre', 'Plaquiste', 'Carreleur', 'Menuisier', 'Maçon', 'Couvreur', 'Paysagiste', 'Multiservice'];
export const CLE_PLUS_TARD = 'flashdevis:bienvenue-plus-tard';

export default function Bienvenue() {
  const etat = useEtat();
  const nav = useNavigate();
  const [n, setN] = useState(0);
  const [e, setE] = useState<Entreprise>(etat.entreprise);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const txt = (k: keyof Entreprise, props: Record<string, unknown> = {}) => <input className="champ" value={String(e[k] ?? '')} onChange={ev => setE({ ...e, [k]: ev.target.value })} {...props} />;
  const plusTard = () => { try { localStorage.setItem(CLE_PLUS_TARD, '1'); } catch { /* navigation privée */ } nav('/app', { replace: true }); };
  const siretOk = /^\d{14}$/.test(e.siret.replace(/\s/g, ''));
  const peutContinuer = [!!e.metier.trim(), !!e.nom.trim(), true][n];

  async function terminer() {
    setEnvoi(true); setErreur('');
    try { await enregistrerEntreprise({ ...e, siret: e.siret.replace(/\s/g, '') }); nav('/app', { replace: true }); }
    catch { setErreur('Enregistrement impossible. Vérifiez votre connexion et réessayez.'); setEnvoi(false); }
  }

  return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-col">
      <div className="mt-1 flex items-center justify-between">
        {n > 0 ? <button onClick={() => setN(n - 1)} className="-ml-1 inline-flex items-center gap-1 p-1 text-sm font-semibold text-gris"><IcRetour className="h-5 w-5" />Retour</button> : <span />}
        <button onClick={plusTard} className="p-1 text-sm font-semibold text-gris">Plus tard</button>
      </div>
      <div className="my-3.5 flex gap-1.5" aria-label={`Étape ${n + 1} sur 3`}>{[0, 1, 2].map(i => <span key={i} className={`h-1 flex-1 rounded ${i <= n ? 'bg-encre-900' : 'bg-trait'}`} />)}</div>

      {n === 0 && <>
        <h1 className="titre-page">Quel est votre métier ?</h1>
        <p className="mt-1 text-sm text-gris">FlashDevis adapte la rédaction et les prix proposés.</p>
        <div className="mt-5 flex flex-wrap gap-2">{METIERS.map(m => (
          <button key={m} onClick={() => setE({ ...e, metier: m })} className={`rounded-full border px-3.5 py-2 text-sm font-semibold ${e.metier === m ? 'border-encre-900 bg-encre-900 text-white' : 'border-trait bg-white'}`}>{m}</button>
        ))}</div>
        <div className="mt-4">{txt('metier', { placeholder: 'Autre métier' })}</div>
      </>}

      {n === 1 && <>
        <h1 className="titre-page">Votre entreprise</h1>
        <p className="mt-1 text-sm text-gris">Ces informations figurent sur chaque devis et facture.</p>
        <div className="mt-5 space-y-3">
          <label className="block"><span className="etiquette">Nom ou raison sociale</span>{txt('nom', { autoFocus: true, placeholder: 'Karim Plomberie' })}</label>
          <label className="block"><span className="etiquette">SIRET</span>{txt('siret', { inputMode: 'numeric', placeholder: '14 chiffres' })}
            {e.siret && !siretOk && <span className="mt-1 block text-xs text-flash-700">Un SIRET compte 14 chiffres.</span>}</label>
          <label className="block"><span className="etiquette">Adresse</span>{txt('adresse', { placeholder: '8 rue Pasteur, 94000 Créteil' })}</label>
          <label className="block"><span className="etiquette">Téléphone</span>{txt('telephone', { inputMode: 'tel' })}</label>
        </div>
      </>}

      {n === 2 && <>
        <h1 className="titre-page">TVA et assurance</h1>
        <p className="mt-1 text-sm text-gris">Pour des mentions légales justes sur vos documents.</p>
        <div className="mt-5 grid grid-cols-2 gap-2">{([['normal', 'Je facture la TVA'], ['franchise', 'Micro-entreprise, sans TVA']] as const).map(([v, lib]) => (
          <button key={v} onClick={() => setE({ ...e, regimeTva: v })} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${e.regimeTva === v ? 'border-encre-900 bg-encre-900 text-white' : 'border-trait bg-white'}`}>{lib}</button>
        ))}</div>
        <div className="mt-4 space-y-3">
          {e.regimeTva === 'normal' && <label className="block"><span className="etiquette">N° de TVA intracommunautaire</span>{txt('numeroTva', { placeholder: 'FR12 345678901' })}</label>}
          <label className="block"><span className="etiquette">Assurance décennale ou RC pro</span>{txt('assurance', { placeholder: 'Assureur, n° de contrat' })}<span className="mt-1 block text-xs text-gris">Obligatoire sur les devis du bâtiment. Vous pourrez la compléter plus tard.</span></label>
        </div>
      </>}

      <div className="mt-auto pt-8">
        {erreur && <p role="alert" className="mb-2 text-sm text-alerte">{erreur}</p>}
        <button onClick={() => (n < 2 ? setN(n + 1) : terminer())} disabled={!peutContinuer || envoi} className="btn-primaire w-full rounded-2xl py-4 text-base font-extrabold">
          {n < 2 ? 'Continuer' : envoi ? 'Enregistrement…' : 'C’est parti'}
        </button>
      </div>
    </div>
  );
}
