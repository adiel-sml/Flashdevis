// Création d'un devis en trois temps : 1. dicter (on parle, c'est tout), 2. vérifier les lignes, 3. envoyer (sur la fiche du devis).
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Avatar, Feuille } from '../components/Elements';
import { IcClavier, IcCorbeille, IcFermer, IcMicro, IcPlus, IcRetour } from '../components/Icones';
import { euros, totalLigne, totaux } from '../lib/calcul';
import { useDictee } from '../lib/dictee';
import { apprendreTarifs, enregistrerDevis, ErreurQuota, getEtat, id, useEtat } from '../lib/store';
import { clients as listeClients, tarifsEvoques } from '../lib/suivi';
import { jetonAcces } from '../lib/supabase';
import type { Client, Devis, Ligne } from '../lib/types';

const ligneVide = (tva: number): Ligne => ({ id: id(), designation: '', quantite: 1, unite: 'u', prixUnitaireHt: 0, tauxTva: tva, estimation: false });
const TAUX = [20, 10, 5.5, 0];
const nombre = (v: string) => { const n = Number(v.replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const clientVide: Client = { nom: '', adresse: '', email: '', telephone: '' };

function Etapes({ n }: { n: 1 | 2 }) {
  return <div className="my-3.5 flex gap-1.5" aria-label={`Étape ${n} sur 3`}>{[1, 2, 3].map(i => <span key={i} className={`h-1 flex-1 rounded ${i <= n ? 'bg-encre-900' : 'bg-trait'}`} />)}</div>;
}

export default function EditeurDevis() {
  const { id: idDevis } = useParams();
  const [params] = useSearchParams();
  const { entreprise, tarifs, devis } = useEtat();
  const existant = idDevis ? getEtat().devis.find(d => d.id === idDevis) : undefined;
  const nav = useNavigate();
  const tvaDefaut = entreprise.regimeTva === 'franchise' ? 0 : 20;
  const connus = useMemo(() => listeClients(devis, entreprise.regimeTva), [devis, entreprise.regimeTva]);
  const prerempli = connus.find(c => c.cle === params.get('client'));

  const [etape, setEtape] = useState<1 | 2>(existant ? 2 : 1);
  const [clavier, setClavier] = useState(false);
  const [choixClient, setChoixClient] = useState(false);
  const [description, setDescription] = useState('');
  const [titre, setTitre] = useState(existant?.titre ?? '');
  const [client, setClient] = useState<Client>(existant?.client ?? (prerempli ? { nom: prerempli.nom, adresse: prerempli.adresse, email: prerempli.email, telephone: prerempli.telephone } : clientVide));
  const [lignes, setLignes] = useState<Ligne[]>(existant?.lignes ?? []);
  const [remarques, setRemarques] = useState(existant?.remarques ?? '');
  const [conseils, setConseils] = useState<string[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [quota, setQuota] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const dictee = useDictee(t => setDescription(d => (d ? `${d} ${t}` : t)));
  const texte = dictee.provisoire ? `${description} ${dictee.provisoire}`.trim() : description;
  const evoques = useMemo(() => tarifsEvoques(texte, tarifs), [texte, tarifs]);
  const t = useMemo(() => totaux(lignes, entreprise.regimeTva), [lignes, entreprise.regimeTva]);

  async function rediger() {
    setChargement(true); setErreur(''); dictee.arreter();
    try {
      const jeton = await jetonAcces();
      const r = await fetch('/api/generer-devis', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) },
        body: JSON.stringify({ texte: description, metier: entreprise.metier, regimeTva: entreprise.regimeTva, tarifs: tarifs.slice(-80).map(({ designation, unite, prixHt }) => ({ designation, unite, prixHt })) }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.erreur || 'La rédaction a échoué. Réessayez.');
      setTitre(x => x || data.titre);
      setLignes(x => [...x, ...data.lignes.map((l: { designation: string; quantite: number; unite: string; prix_unitaire_ht: number; taux_tva: number; estimation: boolean }) => ({ id: id(), designation: l.designation, quantite: l.quantite, unite: l.unite, prixUnitaireHt: l.prix_unitaire_ht, tauxTva: l.taux_tva, estimation: l.estimation }))]);
      setConseils(data.remarques ?? []);
      setEtape(2);
    } catch (e) { setErreur(e instanceof Error ? e.message : 'La rédaction a échoué. Réessayez.'); }
    finally { setChargement(false); }
  }

  const maj = (i: number, patch: Partial<Ligne>) => setLignes(ls => ls.map((l, j) => (j === i ? { ...l, ...patch, estimation: 'prixUnitaireHt' in patch ? false : l.estimation } : l)));

  async function enregistrer() {
    const d: Devis = {
      ...existant, id: existant?.id ?? id(), numero: existant?.numero ?? '',
      titre: titre.trim() || 'Devis', client, lignes: lignes.filter(l => l.designation.trim()), remarques,
      dateCreation: existant?.dateCreation ?? new Date().toISOString(), statut: existant?.statut ?? 'brouillon',
    };
    setEnvoi(true); setErreur(''); setQuota(false);
    try {
      const final = await enregistrerDevis(d);
      apprendreTarifs(d.lignes.filter(l => !l.estimation)).catch(() => { /* non bloquant */ });
      nav(`/app/devis/${final.id}`, { replace: true });
    } catch (e) {
      if (e instanceof ErreurQuota) setQuota(true);
      else setErreur('Enregistrement impossible. Vérifiez votre connexion et réessayez.');
    } finally { setEnvoi(false); }
  }

  const quitter = () => (existant ? nav(`/app/devis/${existant.id}`) : nav(-1));

  // ---------- 1. Dicter ----------
  if (etape === 1) return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-col">
      <div className="mt-1 flex items-center justify-between">
        <button onClick={quitter} aria-label="Fermer" className="-ml-1 p-1"><IcFermer /></button>
        <span className="text-sm font-semibold text-gris">1 · Dicter</span>
        <button onClick={() => { dictee.arreter(); setClavier(x => !x); }} className="inline-flex items-center gap-1.5 text-sm font-semibold">{clavier ? <><IcMicro className="h-4 w-4" />Parler</> : <><IcClavier className="h-4 w-4" />Taper</>}</button>
      </div>
      <Etapes n={1} />

      <p className="lab mb-2">Pour qui ?</p>
      <button onClick={() => setChoixClient(true)} className="flex items-center gap-2.5 rounded-[14px] border border-trait bg-white px-3 py-2.5 text-left text-sm">
        {client.nom ? <><Avatar nom={client.nom} taille="h-[30px] w-[30px] text-xs" /><b className="truncate">{client.nom}</b>{client.adresse && <span className="truncate text-gris">· {client.adresse}</span>}<span className="ml-auto shrink-0 text-gris">changer</span></>
          : <><span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-dashed border-gris/50 text-gris"><IcPlus className="h-4 w-4" /></span><span className="text-gris">Choisir ou ajouter un client</span></>}
      </button>

      {clavier ? (
        <textarea autoFocus className="mt-5 min-h-48 w-full resize-none bg-transparent text-[21px] font-semibold leading-snug tracking-tight outline-none placeholder:text-[#b3ad9f]" value={description} onChange={e => setDescription(e.target.value)} maxLength={2000}
          placeholder="Salle de bain 6 m², dépose de l’ancien carrelage, faïence fournie et posée…" />
      ) : (
        <p className={`mt-5 min-h-28 text-[21px] font-semibold leading-snug tracking-tight ${texte ? '' : 'text-[#b3ad9f]'}`}>
          {description}{dictee.provisoire && <span className="text-[#b3ad9f]"> {dictee.provisoire}</span>}
          {!texte && 'Décrivez le chantier comme à un collègue : surfaces, matériaux, fournitures, dépose…'}
        </p>
      )}
      {evoques.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{evoques.map(x => <span key={x.id} className="rounded-[9px] border border-dashed border-[#cfc8ba] bg-white px-2.5 py-1.5 text-[12.5px] font-semibold text-encre-600">{x.designation} · {euros(x.prixHt)}{x.unite !== 'u' && ` / ${x.unite}`}</span>)}</div>}
      {(erreur || dictee.erreur) && <p role="alert" className="mt-4 rounded-xl bg-alerte-pale px-3 py-2 text-sm text-alerte">{erreur || dictee.erreur}</p>}

      <div className="mt-auto pt-6 text-center">
        {!clavier && <>
          {dictee.ecoute && <div className="mb-3 flex h-14 items-center justify-center gap-1" aria-hidden>{[14, 30, 46, 22, 54, 34, 18, 40, 26, 50, 20, 36, 12].map((h, i) => <span key={i} className="w-1 animate-pulse rounded bg-encre-900" style={{ height: h, animationDelay: `${i * 90}ms` }} />)}</div>}
          <button onClick={dictee.ecoute ? dictee.arreter : dictee.demarrer} aria-pressed={dictee.ecoute} aria-label={dictee.ecoute ? 'Arrêter la dictée' : 'Dicter'}
            className={`mx-auto grid h-[88px] w-[88px] place-items-center rounded-[30px] transition active:scale-95 ${dictee.ecoute ? 'bg-alerte shadow-[0_0_0_10px_rgba(194,65,45,.12)]' : 'bg-encre-900 text-flash-500'}`}>
            {dictee.ecoute ? <span className="h-[26px] w-[26px] rounded-[7px] bg-white" /> : <IcMicro className="h-9 w-9" />}
          </button>
          <p className="mt-3 text-[13px] text-gris">{dictee.ecoute ? 'Touchez pour arrêter. Vos prix habituels sont repris tout seuls.' : description ? 'Touchez pour compléter.' : 'Touchez pour parler.'}</p>
        </>}
        {description.trim().length >= 5 && !dictee.ecoute && (
          <button onClick={rediger} disabled={chargement} className="btn-primaire mt-4 w-full rounded-2xl py-4 text-base font-extrabold">{chargement ? 'Rédaction du devis…' : 'Rédiger le devis'}</button>
        )}
        <button onClick={() => { dictee.arreter(); setLignes(ls => (ls.length ? ls : [ligneVide(tvaDefaut)])); setEtape(2); }} className="mt-2 py-2 text-[13px] font-semibold text-gris">Remplir les lignes moi-même</button>
      </div>

      <Feuille ouverte={choixClient} fermer={() => setChoixClient(false)}>
        <p className="mb-3 text-lg font-extrabold">Pour qui ?</p>
        <input autoFocus className="champ" placeholder="Nom d’un nouveau client" value={client.nom} onChange={e => setClient({ ...client, nom: e.target.value })} onKeyDown={e => e.key === 'Enter' && setChoixClient(false)} />
        <input className="champ mt-2" placeholder="Adresse du chantier (facultatif)" value={client.adresse} onChange={e => setClient({ ...client, adresse: e.target.value })} />
        <button onClick={() => setChoixClient(false)} className="btn-primaire mt-3 w-full">Valider</button>
        {connus.length > 0 && <>
          <p className="lab mb-1 mt-5">Clients récents</p>
          <ul>{connus.slice(0, 12).map(c => (
            <li key={c.cle}><button onClick={() => { setClient({ nom: c.nom, adresse: c.adresse, email: c.email, telephone: c.telephone }); setChoixClient(false); }} className="flex w-full items-center gap-3 border-b border-[#f0ece4] py-2.5 text-left">
              <Avatar nom={c.nom} taille="h-9 w-9 text-xs" /><span className="min-w-0"><b className="block truncate text-sm">{c.nom}</b><span className="block truncate text-xs text-gris">{c.adresse || `${c.devis.length} devis`}</span></span>
            </button></li>
          ))}</ul>
        </>}
      </Feuille>
    </div>
  );

  // ---------- 2. Vérifier ----------
  return (
    <div>
      <div className="mt-1 flex items-center justify-between">
        <button onClick={() => (existant ? quitter() : setEtape(1))} className="-ml-1 inline-flex items-center gap-1 p-1 text-sm font-semibold text-gris"><IcRetour className="h-5 w-5" />{existant ? 'Annuler' : 'Dicter'}</button>
        <span className="text-sm font-semibold text-gris">{existant ? existant.numero : '2 · Vérifier'}</span>
        <span className="w-16" />
      </div>
      {!existant && <Etapes n={2} />}

      <input aria-label="Objet du devis" className="mt-3 w-full bg-transparent text-2xl font-extrabold tracking-tight outline-none placeholder:text-[#b3ad9f]" value={titre} onChange={e => setTitre(e.target.value)} placeholder="Objet du devis" />

      <details className="group mt-3 rounded-2xl border border-trait bg-white" open={!client.nom}>
        <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3.5 py-3 text-sm">
          {client.nom ? <Avatar nom={client.nom} taille="h-[30px] w-[30px] text-xs" /> : <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-dashed border-gris/50 text-gris"><IcPlus className="h-4 w-4" /></span>}
          <span className="min-w-0 flex-1"><b className="block truncate">{client.nom || 'Client'}</b><span className="block truncate text-xs text-gris">{[client.adresse, client.telephone, client.email].filter(Boolean).join(' · ') || 'Nom, adresse du chantier, contact'}</span></span>
          <span className="text-xs font-semibold text-gris group-open:hidden">modifier</span>
        </summary>
        <div className="grid gap-2 border-t border-[#f0ece4] p-3.5">
          <input className="champ" placeholder="Nom" value={client.nom} onChange={e => setClient({ ...client, nom: e.target.value })} />
          <input className="champ" placeholder="Adresse du chantier" value={client.adresse} onChange={e => setClient({ ...client, adresse: e.target.value })} />
          <div className="grid grid-cols-2 gap-2"><input className="champ" inputMode="tel" placeholder="Téléphone" value={client.telephone} onChange={e => setClient({ ...client, telephone: e.target.value })} /><input className="champ" type="email" placeholder="E-mail" value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} /></div>
        </div>
      </details>

      {conseils.length > 0 && <ul className="mt-3 space-y-1 rounded-2xl bg-flash-100 px-4 py-3 text-[13px] text-encre-800"><li className="font-bold">À vérifier avant d’envoyer</li>{conseils.map((c, i) => <li key={i}>{c}</li>)}</ul>}

      <p className="lab mb-2 mt-5">Lignes</p>
      <ul className="space-y-2">{lignes.map((l, i) => (
        <li key={l.id} className={`rounded-2xl border bg-white p-3 ${l.estimation ? 'border-flash-400' : 'border-trait'}`}>
          <div className="flex items-start gap-2">
            <textarea rows={1} aria-label="Désignation" className="min-h-[1.5rem] flex-1 resize-none bg-transparent text-[14.5px] font-semibold leading-snug outline-none [field-sizing:content]" value={l.designation} onChange={e => maj(i, { designation: e.target.value })} placeholder="Désignation" />
            <button aria-label="Supprimer la ligne" onClick={() => setLignes(ls => ls.filter((_, j) => j !== i))} className="-mr-1 -mt-0.5 p-1 text-gris"><IcCorbeille className="h-[18px] w-[18px]" /></button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
            <input aria-label="Quantité" inputMode="decimal" className="w-14 rounded-lg bg-papier px-2 py-1.5 text-center font-semibold outline-none" value={l.quantite} onChange={e => maj(i, { quantite: nombre(e.target.value) })} />
            <input aria-label="Unité" className="w-12 rounded-lg bg-papier px-2 py-1.5 text-center outline-none" value={l.unite} onChange={e => maj(i, { unite: e.target.value })} />
            <span className="text-gris">×</span>
            <span className="inline-flex items-center rounded-lg bg-papier pr-2"><input aria-label="Prix unitaire HT" inputMode="decimal" className={`w-[4.5rem] bg-transparent px-2 py-1.5 text-right font-semibold outline-none ${l.estimation ? 'text-flash-700' : ''}`} value={l.prixUnitaireHt} onChange={e => maj(i, { prixUnitaireHt: nombre(e.target.value) })} />€</span>
            {entreprise.regimeTva === 'normal' && <select aria-label="TVA" className="rounded-lg bg-papier px-1.5 py-1.5 text-[13px] outline-none" value={l.tauxTva} onChange={e => maj(i, { tauxTva: Number(e.target.value) })}>{TAUX.map(x => <option key={x} value={x}>TVA {String(x).replace('.', ',')} %</option>)}</select>}
            <b className="ml-auto">{euros(totalLigne(l))}</b>
          </div>
          {l.estimation && <p className="mt-1.5 text-xs font-semibold text-flash-700">Prix estimé : vérifiez-le. Une fois corrigé, il est mémorisé.</p>}
        </li>
      ))}</ul>
      <button onClick={() => setLignes(ls => [...ls, ligneVide(tvaDefaut)])} className="btn-secondaire mt-2 w-full"><IcPlus className="h-5 w-5" />Ajouter une ligne</button>
      <label className="mt-5 block"><span className="lab mb-2 block">Note au client (facultatif)</span><textarea className="champ min-h-20" value={remarques} onChange={e => setRemarques(e.target.value)} placeholder="Délai d’intervention, accès au chantier…" /></label>

      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-papier from-75% to-transparent px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
        <div className="mx-auto max-w-lg">
          {quota && <p role="alert" className="mb-2 rounded-xl bg-flash-100 px-3 py-2 text-sm">{new ErreurQuota().message} <Link to="/#tarifs" className="font-bold underline">Voir l’offre Pro</Link></p>}
          {erreur && <p role="alert" className="mb-2 rounded-xl bg-alerte-pale px-3 py-2 text-sm text-alerte">{erreur}</p>}
          <div className="flex items-center gap-3">
            <div className="shrink-0"><p className="text-xs text-gris">{entreprise.regimeTva === 'normal' ? 'Total TTC' : 'Total'}</p><p className="text-lg font-extrabold">{euros(t.ttc)}</p></div>
            <button onClick={enregistrer} disabled={envoi || !lignes.some(l => l.designation.trim())} className="btn-primaire flex-1 rounded-2xl py-4 text-base font-extrabold">{envoi ? 'Enregistrement…' : existant ? 'Enregistrer' : 'Valider le devis'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
