import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, eurosRond } from '../components/Elements';
import { IcCoche, IcEnvoi, IcHorloge, IcMicro } from '../components/Icones';
import { envoyerDevis, relancerAcompte, relancerDevis, relancerFacture } from '../lib/messages';
import { enregistrerDevis, facturerDevis, useEtat } from '../lib/store';
import { actions, enJeu, signature, signeParMois, type Action } from '../lib/suivi';

const ICONE: Record<Action['type'], { Ic: typeof IcHorloge; fond: string }> = {
  'relancer-facture': { Ic: IcHorloge, fond: 'bg-alerte-pale text-alerte' },
  'relancer-acompte': { Ic: IcHorloge, fond: 'bg-alerte-pale text-alerte' },
  'relancer-devis': { Ic: IcEnvoi, fond: 'bg-info-pale text-info' },
  facturer: { Ic: IcCoche, fond: 'bg-ok-pale text-ok' },
  envoyer: { Ic: IcEnvoi, fond: 'bg-creme text-encre-600' },
};
const NOM_MOIS = (cle: string) => new Date(`${cle}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'long' });

export default function TableauDeBord() {
  const { devis, entreprise } = useEtat();
  const nav = useNavigate();
  const [tout, setTout] = useState(false);
  const [erreur, setErreur] = useState('');
  const regime = entreprise.regimeTva;
  const jeu = enJeu(devis, regime);
  const aFaire = actions(devis, regime);
  const mois = signeParMois(devis, regime);
  const [precedent, courant] = [mois[4].total, mois[5].total];
  const evolution = precedent > 0 ? Math.round(((courant - precedent) / precedent) * 100) : null;
  const max = Math.max(...mois.map(m => m.total), 1);
  const sig = signature(devis);
  const jour = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }), aujourdhui = jour[0].toUpperCase() + jour.slice(1);

  async function agir(a: Action) {
    setErreur('');
    try {
      if (a.type === 'relancer-facture') await relancerFacture(a.devis, entreprise);
      else if (a.type === 'relancer-acompte') await relancerAcompte(a.devis, entreprise);
      else if (a.type === 'relancer-devis') await relancerDevis(a.devis, entreprise);
      else if (a.type === 'facturer') { await facturerDevis(a.devis); nav(`/app/devis/${a.devis.id}`); }
      else if (await envoyerDevis(a.devis, entreprise)) await enregistrerDevis({ ...a.devis, statut: 'envoye' });
    } catch { setErreur('L’opération n’a pas pu être enregistrée. Vérifiez votre connexion.'); }
  }

  return (
    <div>
      <div className="mb-5 mt-2 flex items-center justify-between">
        <div><h1 className="text-[22px] font-extrabold tracking-tight">Bonjour{entreprise.nom ? `, ${entreprise.nom.split(' ')[0]}` : ''}</h1><p className="text-[13px] text-gris">{aujourdhui}</p></div>
        <Link to="/app/profil" aria-label="Profil"><Avatar nom={entreprise.nom || 'F D'} sombre src={entreprise.logo} /></Link>
      </div>

      {devis.length === 0 ? (
        <section className="rounded-[22px] bg-encre-900 p-5 text-white">
          <p className="lab !text-[#9aa1ad]">Premier devis</p>
          <p className="mt-2 text-[26px] font-extrabold leading-tight tracking-tight">Dictez votre chantier, le devis s’écrit seul.</p>
          <Link to="/app/nouveau" className="btn-primaire mt-5 w-full py-3.5 text-base"><IcMicro className="h-5 w-5" />Faire mon premier devis</Link>
        </section>
      ) : (
        <section className="rounded-[22px] bg-encre-900 p-5 text-white">
          <p className="lab !text-[#9aa1ad]">Reste à encaisser</p>
          <p className="mt-1 text-[38px] font-extrabold leading-none tracking-tight">{eurosRond(jeu.total)}</p>
          <p className="mt-2 text-[13px] text-[#b9bfca]">{jeu.nb ? `sur ${jeu.nb} devis et factures en cours` : 'Tout est encaissé. Bravo.'}</p>
          {jeu.total > 0 && <>
            <div className="mb-2.5 mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-md">
              {jeu.attente > 0 && <span style={{ flex: jeu.attente }} className="bg-[#6f8fe0]" />}
              {jeu.aFacturer > 0 && <span style={{ flex: jeu.aFacturer }} className="bg-[#46b07a]" />}
              {jeu.impaye > 0 && <span style={{ flex: jeu.impaye }} className="bg-flash-500" />}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-[#b9bfca]">
              {[['En attente', jeu.attente, 'bg-[#6f8fe0]'], ['À facturer', jeu.aFacturer, 'bg-[#46b07a]'], ['Impayé', jeu.impaye, 'bg-flash-500']].map(([lib, v, c]) => (
                <div key={lib as string}><span className="inline-flex items-center gap-1.5"><i className={`h-2 w-2 rounded-sm ${c}`} />{lib}</span><b className="mt-0.5 block text-[15px] text-white">{eurosRond(v as number)}</b></div>
              ))}
            </div>
          </>}
        </section>
      )}

      {aFaire.length > 0 && <>
        <div className="mb-2.5 mt-6 flex items-baseline justify-between"><h2 className="text-[17px] font-extrabold">À faire</h2><span className="text-[13px] font-semibold text-gris">{aFaire.length} action{aFaire.length > 1 ? 's' : ''}</span></div>
        <ul className="space-y-2">
          {(tout ? aFaire : aFaire.slice(0, 4)).map(a => { const { Ic, fond } = ICONE[a.type]; return (
            <li key={a.devis.id + a.type} className="flex items-center gap-3 rounded-2xl border border-trait bg-white py-3 pl-3.5 pr-3">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] ${fond}`}><Ic className="h-[19px] w-[19px]" /></span>
              <Link to={`/app/devis/${a.devis.id}`} className="min-w-0 flex-1"><b className="block truncate text-sm font-bold">{a.titre}</b><span className="block truncate text-[12.5px] text-gris">{a.detail}</span></Link>
              <button onClick={() => agir(a)} className="btn-petit">{a.bouton}</button>
            </li>
          ); })}
        </ul>
        {aFaire.length > 4 && <button onClick={() => setTout(x => !x)} className="mt-2 w-full py-2 text-[13px] font-semibold text-gris">{tout ? 'Réduire' : `Voir les ${aFaire.length - 4} autres`}</button>}
        {erreur && <p role="alert" className="mt-2 text-sm text-alerte">{erreur}</p>}
      </>}

      {devis.length > 0 && <>
        <div className="mb-2.5 mt-6 flex items-baseline justify-between"><h2 className="text-[17px] font-extrabold">Ce mois-ci</h2><span className="text-[13px] font-semibold capitalize text-gris">{NOM_MOIS(mois[5].mois)}</span></div>
        <div className="grid grid-cols-2 gap-2">
          <div className="carte !p-3.5">
            <p className="lab">Chiffre signé</p>
            <p className="mt-1 text-[22px] font-extrabold tracking-tight">{eurosRond(courant)}</p>
            <p className={`mt-0.5 text-xs ${evolution === null ? 'text-gris' : evolution >= 0 ? 'text-ok' : 'text-alerte'}`}>{evolution === null ? 'premier mois suivi' : `${evolution >= 0 ? '+' : ''}${evolution} % vs ${NOM_MOIS(mois[4].mois)}`}</p>
            <div className="mt-2.5 flex h-11 items-end gap-[5px]" aria-label="Chiffre signé des 6 derniers mois">
              {mois.map((m, i) => <span key={m.mois} title={`${NOM_MOIS(m.mois)} : ${eurosRond(m.total)}`} style={{ height: `${Math.max(6, (m.total / max) * 100)}%` }} className={`flex-1 rounded-[3px] ${i === 5 ? 'bg-flash-500' : 'bg-creme'}`} />)}
            </div>
          </div>
          <div className="carte !p-3.5">
            <p className="lab">Taux de signature</p>
            {sig.envoyes ? <>
              <p className="mt-1 text-[22px] font-extrabold tracking-tight">{Math.round((sig.signes / sig.envoyes) * 10)} sur 10</p>
              <p className="mt-0.5 text-xs text-gris">{sig.delaiMoyen === null ? `${sig.signes} signé${sig.signes > 1 ? 's' : ''} sur ${sig.envoyes} envoyés` : `signés en ${sig.delaiMoyen || 1} jour${sig.delaiMoyen > 1 ? 's' : ''} en moyenne`}</p>
              <div className="mt-2.5 flex h-11 items-end gap-[5px]"><span style={{ flex: sig.signes || 0.001 }} className="h-full rounded-[3px] bg-flash-500" /><span style={{ flex: sig.envoyes - sig.signes || 0.001 }} className="h-full rounded-[3px] bg-creme" /></div>
            </> : <p className="mt-2 text-[13px] text-gris">Envoyez un premier devis pour suivre vos signatures.</p>}
          </div>
        </div>
      </>}
    </div>
  );
}
