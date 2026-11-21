// Premier lancement : l'entreprise retrouvée dans le registre officiel remplit presque tout, puis deux choix rapides
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IcRetour } from '../components/Icones';
import { ChampAdresse, RechercheEntreprise } from '../components/Saisie';
import { enregistrerEntreprise, useEtat } from '../lib/store';
import { supabase } from '../lib/supabase';
import type { Entreprise } from '../lib/types';

export const METIERS = ['Plombier chauffagiste', 'Électricien', 'Peintre', 'Plaquiste', 'Carreleur', 'Menuisier', 'Maçon', 'Couvreur', 'Paysagiste', 'Multiservice'];
export const CLE_PLUS_TARD = 'flashdevis:bienvenue-plus-tard';

export default function Bienvenue() {
  const etat = useEtat();
  const nav = useNavigate();
  const [n, setN] = useState(0);
  const [e, setE] = useState<Entreprise>(etat.entreprise);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  // e-mail du compte repris d'office
  useEffect(() => { supabase?.auth.getUser().then(({ data }) => { const m = data.user?.email; if (m) setE(x => (x.email ? x : { ...x, email: m })); }); }, []);
  const txt = (k: keyof Entreprise, props: Record<string, unknown> = {}) => <input className="champ" value={String(e[k] ?? '')} onChange={ev => setE({ ...e, [k]: ev.target.value })} {...props} />;
  const plusTard = () => { try { localStorage.setItem(CLE_PLUS_TARD, '1'); } catch { /* navigation privée */ } nav('/app', { replace: true }); };
  const siretOk = /^\d{14}$/.test(e.siret.replace(/\s/g, ''));
  const peutContinuer = [!!e.nom.trim(), !!e.metier.trim(), true][n];

  async function terminer() {
    setEnvoi(true); setErreur('');
    try { await enregistrerEntreprise({ ...e, siret: e.siret.replace(/\s/g, '') }); nav('/app', { replace: true }); }
    catch { setErreur('Enregistrement impossible. Vérifiez votre connexion.'); setEnvoi(false); }
  }

  return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-col">
      <div className="mt-1 flex min-h-11 items-center justify-between">
        {n > 0 ? <button onClick={() => setN(n - 1)} className="-ml-1 inline-flex min-h-11 items-center gap-1 px-1 text-sm font-semibold text-gris"><IcRetour className="h-5 w-5" />Retour</button> : <span />}
        <button onClick={plusTard} className="min-h-11 px-1 text-sm font-semibold text-gris">Plus tard</button>
      </div>
      <div className="mb-5 mt-2 flex gap-1.5" aria-label={`Étape ${n + 1} sur 3`}>{[0, 1, 2].map(i => <span key={i} className={`h-1 flex-1 rounded ${i <= n ? 'bg-encre-900' : 'bg-trait'}`} />)}</div>

      {n === 0 && <>
        <h1 className="titre-page">Votre entreprise</h1>
        <div className="mt-5"><RechercheEntreprise choisir={x => setE({ ...e, nom: x.nom, siret: x.siret || e.siret, adresse: x.adresse || e.adresse, metier: x.metier || e.metier })} /></div>
        <p className="mt-2 text-[13px] text-gris">On remplit le reste pour vous, depuis le registre officiel.</p>
        <div className="mt-5 space-y-3">
          <label className="block"><span className="etiquette">Nom</span>{txt('nom')}</label>
          <label className="block"><span className="etiquette">SIRET</span>{txt('siret', { inputMode: 'numeric', placeholder: '14 chiffres' })}
            {e.siret && !siretOk && <span className="mt-1 block text-xs text-flash-700">Un SIRET compte 14 chiffres.</span>}</label>
          <div><span className="etiquette">Adresse</span><ChampAdresse valeur={e.adresse} changer={adresse => setE({ ...e, adresse })} /></div>
          <label className="block"><span className="etiquette">Téléphone</span>{txt('telephone', { inputMode: 'tel', autoComplete: 'tel' })}</label>
        </div>
      </>}

      {n === 1 && <>
        <h1 className="titre-page">Votre métier</h1>
        <div className="mt-5 flex flex-wrap gap-2">{METIERS.map(m => <button key={m} onClick={() => setE({ ...e, metier: m })} className={`puce ${e.metier === m ? 'puce-on' : ''}`}>{m}</button>)}</div>
        <div className="mt-4">{txt('metier', { placeholder: 'Autre métier' })}</div>
      </>}

      {n === 2 && <>
        <h1 className="titre-page">TVA et assurance</h1>
        <div className="mt-5 grid grid-cols-2 gap-2">{([['normal', 'Je facture la TVA'], ['franchise', 'Sans TVA (micro)']] as const).map(([v, lib]) => (
          <button key={v} onClick={() => setE({ ...e, regimeTva: v })} className={`min-h-14 rounded-xl border px-3 text-sm font-bold ${e.regimeTva === v ? 'border-encre-900 bg-encre-900 text-white' : 'border-trait bg-white'}`}>{lib}</button>
        ))}</div>
        <div className="mt-4 space-y-3">
          {e.regimeTva === 'normal' && <label className="block"><span className="etiquette">N° de TVA</span>{txt('numeroTva', { placeholder: 'FR12 345678901' })}</label>}
          <label className="block"><span className="etiquette">Assurance décennale ou RC pro <span className="font-normal text-gris">(facultatif)</span></span>{txt('assurance', { placeholder: 'Assureur et n° de contrat' })}</label>
        </div>
      </>}

      <div className="mt-auto pt-8">
        {erreur && <p role="alert" className="mb-2 text-sm text-alerte">{erreur}</p>}
        <button onClick={() => (n < 2 ? setN(n + 1) : terminer())} disabled={!peutContinuer || envoi} className="btn-primaire btn-grand w-full">
          {n < 2 ? 'Continuer' : envoi ? 'Enregistrement…' : 'Terminer'}
        </button>
      </div>
    </div>
  );
}
