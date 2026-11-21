// Accueil : l'argent à encaisser, ce qu'il faut faire aujourd'hui, et un graphique simple. Chaque chiffre mène à la liste correspondante.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, eurosRond } from '../components/Elements';
import { IcChevron, IcCoche, IcEnvoi, IcHorloge, IcMicro } from '../components/Icones';
import { envoyerDevis, relancerAcompte, relancerDevis, relancerFacture } from '../lib/messages';
import { enregistrerDevis, facturerDevis, useEtat } from '../lib/store';
import { actions, encaisseParMois, enJeu, parcours, signeParMois, type Action } from '../lib/suivi';

const ICONE: Record<Action['type'], { Ic: typeof IcHorloge; fond: string }> = {
  'relancer-facture': { Ic: IcHorloge, fond: 'bg-alerte-pale text-alerte' },
  'relancer-acompte': { Ic: IcHorloge, fond: 'bg-alerte-pale text-alerte' },
  'relancer-devis': { Ic: IcEnvoi, fond: 'bg-info-pale text-info' },
  facturer: { Ic: IcCoche, fond: 'bg-ok-pale text-ok' },
  envoyer: { Ic: IcEnvoi, fond: 'bg-creme text-encre-600' },
};
const MOIS_COURT = (cle: string) => new Date(`${cle}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
const court = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)} k€` : n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} k€` : `${Math.round(n)} €`);
const evolution = (avant: number, maintenant: number) => (avant > 0 ? Math.round(((maintenant - avant) / avant) * 100) : null);

// Histogramme lisible : valeur au-dessus de chaque barre, mois en dessous, mois en cours en jaune
function Barres({ donnees, titre }: { donnees: { mois: string; total: number }[]; titre: string }) {
  const max = Math.max(...donnees.map(d => d.total), 1);
  return (
    <div role="img" aria-label={`${titre} : ${donnees.map(d => `${MOIS_COURT(d.mois)} ${eurosRond(d.total)}`).join(', ')}`} className="mt-4 grid h-36 grid-cols-6 items-end gap-2">
      {donnees.map((d, i) => (
        <div key={d.mois} className="flex h-full flex-col items-center justify-end gap-1">
          <span className={`text-[11px] font-bold ${i === donnees.length - 1 ? 'text-encre-900' : 'text-gris'}`}>{d.total ? court(d.total) : ''}</span>
          <span style={{ height: `${Math.max(4, (d.total / max) * 100)}%` }} className={`w-full max-w-9 rounded-md ${i === donnees.length - 1 ? 'bg-flash-500' : d.total ? 'bg-encre-900/15' : 'bg-creme'}`} />
          <span className="text-[11px] font-semibold capitalize text-gris">{MOIS_COURT(d.mois)}</span>
        </div>
      ))}
    </div>
  );
}

export default function TableauDeBord() {
  const { devis, entreprise } = useEtat();
  const nav = useNavigate();
  const [tout, setTout] = useState(false);
  const [courbe, setCourbe] = useState<'encaisse' | 'signe'>('encaisse');
  const [erreur, setErreur] = useState('');
  const regime = entreprise.regimeTva;
  const jeu = enJeu(devis, regime), aFaire = actions(devis, regime), p = parcours(devis);
  const serie = courbe === 'encaisse' ? encaisseParMois(devis, regime) : signeParMois(devis, regime);
  const evo = evolution(serie[4].total, serie[5].total);
  const jour = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  async function agir(a: Action) {
    setErreur('');
    try {
      if (a.type === 'relancer-facture') await relancerFacture(a.devis, entreprise);
      else if (a.type === 'relancer-acompte') await relancerAcompte(a.devis, entreprise);
      else if (a.type === 'relancer-devis') await relancerDevis(a.devis, entreprise);
      else if (a.type === 'facturer') { if (a.devis.acompte || !entreprise.acomptePct) await facturerDevis(a.devis); nav(`/app/devis/${a.devis.id}`); }
      else if (await envoyerDevis(a.devis, entreprise)) await enregistrerDevis({ ...a.devis, statut: 'envoye' });
    } catch { setErreur('L’opération n’a pas pu être enregistrée. Vérifiez votre connexion.'); }
  }

  return (
    <div>
      <div className="mb-5 mt-2 flex items-center justify-between">
        <div><h1 className="text-[22px] font-extrabold tracking-tight">Bonjour{entreprise.nom ? `, ${entreprise.nom.split(' ')[0]}` : ''}</h1><p className="text-[13px] text-gris">{jour[0].toUpperCase() + jour.slice(1)}</p></div>
        <Link to="/app/profil" aria-label="Profil"><Avatar nom={entreprise.nom || 'F D'} sombre src={entreprise.logo} /></Link>
      </div>

      {devis.length === 0 ? (
        <section className="rounded-[22px] bg-encre-900 p-5 text-white">
          <p className="text-[26px] font-extrabold leading-tight tracking-tight">Votre premier devis en une minute.</p>
          <p className="mt-2 text-[15px] text-[#b9bfca]">Décrivez le chantier à voix haute, les lignes s’écrivent seules.</p>
          <Link to="/app/nouveau" className="btn-primaire btn-grand mt-5 w-full"><IcMicro className="h-5 w-5" />Faire un devis</Link>
        </section>
      ) : <>
        {/* L'argent à encaisser, découpé en trois boutons qui ouvrent la liste concernée */}
        <section className="rounded-[22px] bg-encre-900 p-5 text-white">
          <p className="text-[13px] font-semibold text-[#9aa1ad]">À encaisser</p>
          <p className="mt-1 text-[40px] font-extrabold leading-none tracking-tight">{eurosRond(jeu.total)}</p>
          {jeu.total > 0 && <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-md">
            {jeu.attente > 0 && <span style={{ flex: jeu.attente }} className="bg-[#6f8fe0]" />}
            {jeu.aFacturer > 0 && <span style={{ flex: jeu.aFacturer }} className="bg-[#46b07a]" />}
            {jeu.impaye > 0 && <span style={{ flex: jeu.impaye }} className="bg-flash-500" />}
          </div>}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {([['À signer', jeu.attente, 'bg-[#6f8fe0]', 'attente'], ['À facturer', jeu.aFacturer, 'bg-[#46b07a]', 'signes'], ['Impayé', jeu.impaye, 'bg-flash-500', 'impayes']] as const).map(([lib, v, c, f]) => (
              <Link key={f} to={`/app/devis?filtre=${f}`} className="min-h-14 rounded-xl bg-white/[.06] px-2.5 py-2 active:bg-white/10">
                <span className="flex items-center gap-1.5 text-xs text-[#b9bfca]"><i className={`h-2 w-2 rounded-sm ${c}`} />{lib}</span>
                <b className="mt-0.5 block text-[15px]">{eurosRond(v)}</b>
              </Link>
            ))}
          </div>
        </section>

        {aFaire.length > 0 && <>
          <div className="mb-2.5 mt-6 flex items-baseline justify-between"><h2 className="text-[17px] font-extrabold">À faire</h2><span className="text-[13px] font-semibold text-gris">{aFaire.length}</span></div>
          <ul className="space-y-2">
            {(tout ? aFaire : aFaire.slice(0, 3)).map(a => { const { Ic, fond } = ICONE[a.type]; return (
              <li key={a.devis.id + a.type} className="flex items-center gap-3 rounded-2xl border border-trait bg-white py-3 pl-3.5 pr-3">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${fond}`}><Ic className="h-5 w-5" /></span>
                <Link to={`/app/devis/${a.devis.id}`} className="min-w-0 flex-1"><b className="block truncate text-[15px] font-bold">{a.titre}</b><span className="block truncate text-[13px] text-gris">{a.detail}</span></Link>
                <button onClick={() => agir(a)} className="btn-petit">{a.bouton}</button>
              </li>
            ); })}
          </ul>
          {aFaire.length > 3 && <button onClick={() => setTout(x => !x)} className="mt-1 min-h-11 w-full text-sm font-semibold text-gris">{tout ? 'Réduire' : `Voir les ${aFaire.length - 3} autres`}</button>}
          {erreur && <p role="alert" className="mt-2 text-sm text-alerte">{erreur}</p>}
        </>}

        {/* Un graphique, deux lectures : ce qui est encaissé, ce qui est signé */}
        <section className="carte mt-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex rounded-xl bg-papier p-1">
              {([['encaisse', 'Encaissé'], ['signe', 'Signé']] as const).map(([v, lib]) => <button key={v} onClick={() => setCourbe(v)} className={`min-h-10 rounded-lg px-3.5 text-sm font-bold ${courbe === v ? 'bg-white shadow-sm' : 'text-gris'}`}>{lib}</button>)}
            </div>
            <span className="text-xs font-semibold text-gris">6 derniers mois</span>
          </div>
          <div className="mt-4 flex items-end gap-2">
            <p className="text-[26px] font-extrabold leading-none tracking-tight">{eurosRond(serie[5].total)}</p>
            <p className="pb-0.5 text-[13px] text-gris">ce mois-ci{evo !== null && <> · <b className={evo >= 0 ? 'text-ok' : 'text-alerte'}>{evo >= 0 ? '+' : ''}{evo} %</b></>}</p>
          </div>
          <Barres donnees={serie} titre={courbe === 'encaisse' ? 'Encaissé par mois' : 'Signé par mois'} />
        </section>

        {/* Le parcours des devis : chaque étape ouvre la liste */}
        <section className="carte mt-3 !p-0">
          <p className="px-4 pt-4 text-[15px] font-extrabold">Vos devis</p>
          <div className="grid grid-cols-4 divide-x divide-trait py-3">
            {([['Envoyés', p.envoyes, 'tous'], ['Signés', p.signes, 'signes'], ['Facturés', p.factures, 'factures'], ['Payés', p.payes, 'payes']] as const).map(([lib, n, f], i) => (
              <Link key={lib} to={`/app/devis${f === 'tous' ? '' : `?filtre=${f}`}`} className="flex min-h-16 flex-col items-center justify-center px-1">
                <b className="text-[22px] font-extrabold leading-none">{n}</b>
                <span className="mt-1 text-xs font-semibold text-gris">{lib}</span>
                {i > 0 && <span className="mt-0.5 text-[11px] font-bold text-encre-600">{p.envoyes ? Math.round((n / p.envoyes) * 100) : 0} %</span>}
              </Link>
            ))}
          </div>
          <Link to="/app/devis" className="flex min-h-12 items-center justify-between border-t border-trait px-4 text-sm font-bold">Tous les devis<IcChevron className="h-4 w-4 text-gris" /></Link>
        </section>
      </>}
    </div>
  );
}
