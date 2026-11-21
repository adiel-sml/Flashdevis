import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Avatar, EnTete, Feuille } from '../components/Elements';
import { IcBatiment, IcBouclier, IcCarte, IcChevron, IcCorbeille, IcListe, IcPlus, IcRetour } from '../components/Icones';
import { allerVersStripe, attendrePro } from '../lib/abonnement';
import { reduireLogo, telecharger } from '../lib/image';
import { ChampAdresse, RechercheEntreprise } from '../components/Saisie';
import { METIERS } from './Bienvenue';
import { csv, lignesComptables } from '../lib/export';
import { euros } from '../lib/calcul';
import { supprimerCompte } from '../lib/compte';
import { enregistrerEntreprise, enregistrerTarifs, getEtat, id, useEtat } from '../lib/store';
import { conformite, devisDuMois, QUOTA_GRATUIT } from '../lib/suivi';
import { supabase } from '../lib/supabase';
import type { Entreprise, Tarif } from '../lib/types';

const Item = ({ to, Ic, lib, valeur }: { to: string; Ic: typeof IcListe; lib: string; valeur?: string }) => (
  <Link to={to} className="flex items-center gap-3 border-b border-[#f0ece4] px-3.5 py-3.5 text-[14.5px] font-semibold last:border-0">
    <Ic className="h-5 w-5 shrink-0 text-encre-600" />{lib}<span className="ml-auto truncate text-[13.5px] font-medium text-gris">{valeur}</span><IcChevron className="h-4 w-4 shrink-0 text-[#c0b9ab]" />
  </Link>
);

export default function Profil() {
  const { entreprise: e, tarifs, devis, plan, abonnement } = useEtat();
  const c = conformite(e);
  const utilises = Math.min(QUOTA_GRATUIT, devisDuMois(devis));
  const [params, setParams] = useSearchParams();
  const [paiement, setPaiement] = useState<'' | 'attente' | 'ok' | 'lent'>(params.get('abonnement') === 'ok' ? 'attente' : '');
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');
  useEffect(() => {
    if (paiement !== 'attente') return;
    setParams({}, { replace: true });
    attendrePro().then(ok => setPaiement(ok ? 'ok' : 'lent'), () => setPaiement('lent'));
  }, [paiement, setParams]);
  const stripe = (action: 'essai' | 'gerer') => async () => {
    if (!supabase) { location.href = '/#tarifs'; return; }
    setOccupe(true); setErreur('');
    try { await allerVersStripe(action); } catch (x) { setErreur(x instanceof Error ? x.message : 'Paiement indisponible.'); setOccupe(false); }
  };
  const finLe = abonnement.fin ? new Date(abonnement.fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '';
  const detailPro = abonnement.statut === 'trialing' ? `Essai gratuit jusqu’au ${finLe}` : abonnement.statut === 'past_due' ? 'Paiement en attente : mettez à jour votre carte' : finLe ? `Renouvelé le ${finLe}` : 'Devis et factures illimités';
  return (
    <div>
      <EnTete titre="Profil" />
      <Link to="/app/profil/entreprise" className="carte flex items-center gap-3.5 !rounded-[22px] !p-4">
        <Avatar nom={e.nom || 'Mon entreprise'} taille="h-14 w-14 text-xl" sombre src={e.logo} />
        <span className="min-w-0"><b className="block truncate text-[17px] font-extrabold">{e.nom || 'Mon entreprise'}</b><span className="block truncate text-[13px] text-gris">{[e.metier, e.adresse.split(',').at(-1)?.trim()].filter(Boolean).join(' · ') || 'Touchez pour compléter'}</span></span>
      </Link>
      <div className="carte mt-3">
        <div className="flex justify-between text-sm font-bold"><span>{c.faits === c.total ? 'Vos devis sont complets et conformes' : `Vos devis sont conformes à ${Math.round((c.faits / c.total) * 100)} %`}</span><span>{c.faits}/{c.total}</span></div>
        <div className="my-2 h-1.5 overflow-hidden rounded bg-creme"><div className="h-full rounded bg-ok" style={{ width: `${(c.faits / c.total) * 100}%` }} /></div>
        {c.premier && <p className="text-[12.5px] text-gris">Il manque {c.premier.manque}. <Link to={`/app/profil/${c.premier.section}`} className="font-bold text-encre-900">Ajouter</Link></p>}
      </div>
      <div className="mt-3.5 overflow-hidden rounded-[18px] border border-trait bg-white">
        <Item to="/app/profil/entreprise" Ic={IcBatiment} lib="Entreprise" valeur={e.siret ? 'SIRET, adresse' : 'à compléter'} />
        <Item to="/app/profil/tarifs" Ic={IcListe} lib="Mes tarifs" valeur={`${tarifs.length} prix`} />
        <Item to="/app/profil/tva" Ic={IcBouclier} lib="TVA et assurance" valeur={e.regimeTva === 'franchise' ? 'Franchise' : 'Assujetti'} />
        <Item to="/app/profil/paiement" Ic={IcCarte} lib="Paiement et acompte" valeur={`${e.acomptePct} %`} />
        <Item to="/app/profil/comptable" Ic={IcListe} lib="Export comptable" valeur="CSV" />
      </div>
      <div className="mt-3.5 flex items-center justify-between gap-3 rounded-[18px] bg-encre-900 p-4 text-white">
        {plan === 'pro' ? <>
          <div><b className="block text-[15px]">Offre Pro</b><span className={`text-[12.5px] ${abonnement.statut === 'past_due' ? 'text-flash-400' : 'text-[#b9bfca]'}`}>{detailPro}</span></div>
          {abonnement.statut && <button onClick={stripe('gerer')} disabled={occupe} className="shrink-0 rounded-[11px] border border-encre-600 px-3 py-2 text-[13px] font-bold">{occupe ? '…' : 'Gérer'}</button>}
        </> : <>
          <div><b className="block text-[15px]">Offre Découverte</b><span className="text-[12.5px] text-[#b9bfca]">{utilises} devis sur {QUOTA_GRATUIT} utilisés ce mois-ci</span>
            <div className="mt-2 flex gap-1">{Array.from({ length: QUOTA_GRATUIT }, (_, i) => <i key={i} className={`h-1.5 w-[26px] rounded ${i < utilises ? 'bg-flash-500' : 'bg-encre-600'}`} />)}</div></div>
          <button onClick={stripe('essai')} disabled={occupe} className="shrink-0 rounded-[11px] bg-flash-500 px-3 py-2 text-[13px] font-extrabold text-encre-900">{occupe ? '…' : abonnement.statut ? 'Reprendre Pro' : 'Essai 14 jours'}</button>
        </>}
      </div>
      {paiement === 'attente' && <p role="status" className="mt-2 text-center text-[13px] text-gris">Activation de votre offre Pro…</p>}
      {paiement === 'ok' && <p role="status" className="mt-2 rounded-xl bg-ok-pale px-3 py-2 text-center text-[13px] font-semibold text-ok">Offre Pro activée. Devis illimités.</p>}
      {paiement === 'lent' && <p role="status" className="mt-2 text-center text-[13px] text-gris">Paiement reçu. L’offre Pro s’active dans quelques instants, rechargez la page si besoin.</p>}
      {erreur && <p role="alert" className="mt-2 text-center text-[13px] text-alerte">{erreur}</p>}
      <div className="mt-3.5 overflow-hidden rounded-[18px] border border-trait bg-white">
        <Link to="/app/profil/donnees" className="flex items-center px-3.5 py-3.5 text-[14.5px] font-semibold">Mes données<IcChevron className="ml-auto h-4 w-4 text-[#c0b9ab]" /></Link>
        <Link to="/conditions" className="flex items-center border-t border-[#f0ece4] px-3.5 py-3.5 text-[14.5px] font-semibold">Conditions et confidentialité<IcChevron className="ml-auto h-4 w-4 text-[#c0b9ab]" /></Link>
        {supabase && <button onClick={() => supabase!.auth.signOut()} className="w-full border-t border-[#f0ece4] px-3.5 py-3.5 text-left text-[14.5px] font-semibold text-alerte">Se déconnecter</button>}
      </div>
    </div>
  );
}

// ----- Rubriques du profil : un formulaire court par sujet -----
const Champ = ({ lib, children, aide }: { lib: string; children: ReactNode; aide?: string }) => <label className="block"><span className="etiquette">{lib}</span>{children}{aide && <span className="mt-1 block text-xs text-gris">{aide}</span>}</label>;

const CONDITIONS = ['Paiement à réception de facture, par virement.', 'Paiement à 30 jours, par virement.', 'Paiement à la fin des travaux, par virement ou chèque.'];
// Choix rapide parmi des valeurs courantes, sans saisie (une valeur personnalisée reste possible)
function Choix({ lib, options, valeur, suffixe, changer }: { lib: string; options: number[]; valeur: number; suffixe: string; changer: (v: number) => void }) {
  return (
    <div><span className="etiquette">{lib}</span>
      <div className="flex flex-wrap gap-2">
        {options.map(o => <button key={o} type="button" onClick={() => changer(o)} className={`puce ${valeur === o ? 'puce-on' : ''}`}>{o === 0 ? 'Aucun' : `${o}${suffixe}`}</button>)}
        {!options.includes(valeur) && <span className="puce puce-on">{valeur}{suffixe}</span>}
      </div>
    </div>
  );
}

function FormEntreprise({ section }: { section: 'entreprise' | 'tva' | 'paiement' }) {
  const etat = useEtat();
  const nav = useNavigate();
  const [e, setE] = useState<Entreprise>(etat.entreprise);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const txt = (k: keyof Entreprise, props: Record<string, unknown> = {}) => <input className="champ" value={String(e[k])} onChange={ev => setE({ ...e, [k]: ev.target.value })} {...props} />;
  async function enregistrer() {
    setEnvoi(true); setErreur('');
    try { await enregistrerEntreprise(e); nav('/app/profil'); } catch { setErreur('Enregistrement impossible. Vérifiez votre connexion et réessayez.'); } finally { setEnvoi(false); }
  }
  const titres = { entreprise: 'Entreprise', tva: 'TVA et assurance', paiement: 'Paiement et acompte' };
  return (
    <Rubrique titre={titres[section]} pied={<><button onClick={enregistrer} disabled={envoi} className="btn-primaire btn-grand w-full">{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>{erreur && <p role="alert" className="mt-2 text-sm text-alerte">{erreur}</p>}</>}>
      {section === 'entreprise' && <>
        <RechercheEntreprise choisir={x => setE({ ...e, nom: x.nom, siret: x.siret || e.siret, adresse: x.adresse || e.adresse, metier: e.metier || x.metier })} />
        <ChoixLogo logo={e.logo} changer={logo => setE({ ...e, logo })} />
        <Champ lib="Nom">{txt('nom')}</Champ>
        <Champ lib="Métier"><input className="champ" list="metiers" value={e.metier} onChange={ev => setE({ ...e, metier: ev.target.value })} /><datalist id="metiers">{METIERS.map(m => <option key={m} value={m} />)}</datalist></Champ>
        <Champ lib="SIRET">{txt('siret', { inputMode: 'numeric', placeholder: '14 chiffres' })}</Champ>
        <Champ lib="Adresse"><ChampAdresse valeur={e.adresse} changer={adresse => setE({ ...e, adresse })} /></Champ>
        <div className="grid grid-cols-2 gap-3"><Champ lib="Téléphone">{txt('telephone', { inputMode: 'tel', autoComplete: 'tel' })}</Champ><Champ lib="E-mail">{txt('email', { type: 'email', autoComplete: 'email' })}</Champ></div>
      </>}
      {section === 'tva' && <>
        <div className="grid grid-cols-2 gap-2">{([['normal', 'Assujetti à la TVA'], ['franchise', 'Franchise (micro)']] as const).map(([v, lib]) => (
          <button key={v} onClick={() => setE({ ...e, regimeTva: v })} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${e.regimeTva === v ? 'border-encre-900 bg-encre-900 text-white' : 'border-trait bg-white'}`}>{lib}</button>
        ))}</div>
        {e.regimeTva === 'normal' ? <Champ lib="N° de TVA intracommunautaire">{txt('numeroTva', { placeholder: 'FR12 345678901' })}</Champ> : <p className="text-[13px] text-gris">La mention « TVA non applicable, art. 293 B du CGI » est ajoutée à vos documents.</p>}
        <Champ lib="Assurance décennale ou RC pro">{txt('assurance', { placeholder: 'Assureur et n° de contrat' })}</Champ>
      </>}
      {section === 'paiement' && <>
        <Choix lib="Acompte à la signature" options={[0, 30, 40, 50]} valeur={e.acomptePct} suffixe=" %" changer={v => setE({ ...e, acomptePct: v })} />
        <Choix lib="Durée de validité des devis" options={[15, 30, 60, 90]} valeur={e.validiteJours} suffixe=" jours" changer={v => setE({ ...e, validiteJours: v })} />
        <div><span className="etiquette">Conditions de paiement</span>
          <div className="mb-2 flex flex-wrap gap-2">{CONDITIONS.map(c => <button key={c} type="button" onClick={() => setE({ ...e, conditionsPaiement: c })} className={`puce ${e.conditionsPaiement === c ? 'puce-on' : ''}`}>{((x: string) => x[0].toUpperCase() + x.slice(1))(c.replace(/\.$/, '').replace(/^Paiement /, '').replace(/, par virement.*$/, ''))}</button>)}</div>
          <textarea className="champ min-h-20" value={e.conditionsPaiement} onChange={ev => setE({ ...e, conditionsPaiement: ev.target.value })} />
        </div>
      </>}
    </Rubrique>
  );
}

function FormTarifs() {
  const etat = useEtat();
  const nav = useNavigate();
  const [tarifs, setTarifs] = useState<Tarif[]>(etat.tarifs);
  const [erreur, setErreur] = useState('');
  const maj = (i: number, patch: Partial<Tarif>) => setTarifs(ts => ts.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  async function enregistrer() {
    setErreur('');
    try { await enregistrerTarifs(tarifs.filter(t => t.designation.trim())); nav('/app/profil'); } catch { setErreur('Enregistrement impossible : deux tarifs ne peuvent pas avoir le même nom.'); }
  }
  return (
    <Rubrique titre="Mes tarifs" pied={<><button onClick={enregistrer} className="btn-primaire btn-grand w-full">Enregistrer</button>{erreur && <p role="alert" className="mt-2 text-sm text-alerte">{erreur}</p>}</>}>
      <p className="text-[13px] text-gris">Repris dans vos devis. La liste s’enrichit seule quand vous confirmez un prix.</p>
      <ul className="overflow-hidden rounded-[18px] border border-trait bg-white">
        {tarifs.length === 0 && <li className="px-4 py-6 text-center text-sm text-gris">Aucun tarif pour l’instant.</li>}
        {tarifs.map((t, i) => (
          <li key={t.id} className="flex items-center gap-2 border-b border-[#f0ece4] px-3 py-2 last:border-0">
            <input aria-label="Désignation" className="min-w-0 flex-1 bg-transparent py-1.5 text-sm font-semibold outline-none" value={t.designation} onChange={ev => maj(i, { designation: ev.target.value })} placeholder="Désignation" />
            <input aria-label="Prix HT" inputMode="decimal" className="w-20 rounded-lg bg-papier px-2 py-1.5 text-right text-sm font-bold outline-none" value={t.prixHt} onChange={ev => maj(i, { prixHt: Number(ev.target.value.replace(',', '.')) || 0 })} />
            <input aria-label="Unité" className="w-12 rounded-lg bg-papier px-2 py-1.5 text-center text-sm outline-none" value={t.unite} onChange={ev => maj(i, { unite: ev.target.value })} />
            <button aria-label="Supprimer le tarif" onClick={() => setTarifs(ts => ts.filter((_, j) => j !== i))} className="p-1.5 text-gris"><IcCorbeille className="h-[18px] w-[18px]" /></button>
          </li>
        ))}
      </ul>
      <button onClick={() => setTarifs(ts => [...ts, { id: id(), designation: '', unite: 'u', prixHt: 0 }])} className="btn-secondaire w-full"><IcPlus className="h-5 w-5" />Ajouter un tarif</button>
    </Rubrique>
  );
}

function ChoixLogo({ logo, changer }: { logo?: string | null; changer: (l: string | null) => void }) {
  const [erreur, setErreur] = useState('');
  const choisir = async (f?: File) => { if (!f) return; setErreur(''); try { changer(await reduireLogo(f)); } catch (x) { setErreur(x instanceof Error ? x.message : 'Image illisible.'); } };
  return (
    <div>
      <span className="etiquette">Logo (sur vos devis et factures)</span>
      <div className="flex items-center gap-3">
        <label className="grid h-16 w-24 cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-gris/50 bg-white">
          {logo ? <img src={logo} alt="Logo" className="h-full w-full object-contain p-1.5" /> : <IcPlus className="h-6 w-6 text-gris" />}
          <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={ev => choisir(ev.target.files?.[0])} />
        </label>
        <div className="text-[13px] text-gris">{logo ? <button type="button" onClick={() => changer(null)} className="font-semibold text-alerte">Retirer le logo</button> : 'PNG ou JPEG. Il est réduit automatiquement.'}</div>
      </div>
      {erreur && <p role="alert" className="mt-1 text-xs text-alerte">{erreur}</p>}
    </div>
  );
}

// Export pour le comptable : factures et factures d'acompte de la période, en CSV
function ExportComptable() {
  const { devis, entreprise } = useEtat();
  const annees = [...new Set([new Date().getFullYear(), ...devis.flatMap(d => [d.facture?.date, d.acompte?.date].filter((x): x is string => !!x).map(x => new Date(x).getFullYear()))])].sort((a, b) => b - a);
  const [annee, setAnnee] = useState(annees[0]);
  const [mois, setMois] = useState<number | undefined>(undefined);
  const lignes = lignesComptables(devis, entreprise.regimeTva, { annee, mois });
  const somme = (k: 'ht' | 'tva' | 'ttc') => lignes.reduce((s, l) => s + l[k], 0);
  const NOMS = Array.from({ length: 12 }, (_, i) => new Date(2026, i, 1).toLocaleDateString('fr-FR', { month: 'short' }));
  const nom = `factures-${annee}${mois ? `-${String(mois).padStart(2, '0')}` : ''}.csv`;
  return (
    <Rubrique titre="Export comptable" pied={<button onClick={() => telecharger(nom, csv(lignes), 'text/csv;charset=utf-8')} disabled={!lignes.length} className="btn-primaire btn-grand w-full">Télécharger le fichier ({lignes.length} facture{lignes.length > 1 ? 's' : ''})</button>}>
      <p className="text-[13px] text-gris">Un fichier à envoyer à votre comptable : chaque facture et facture d’acompte, avec les montants HT, TVA et TTC et le paiement. Il s’ouvre dans Excel.</p>
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">{annees.map(a => <button key={a} onClick={() => setAnnee(a)} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${a === annee ? 'border-encre-900 bg-encre-900 text-white' : 'border-trait bg-white'}`}>{a}</button>)}</div>
      <div className="grid grid-cols-4 gap-1.5">
        <button onClick={() => setMois(undefined)} className={`col-span-4 rounded-xl border py-2 text-sm font-semibold ${mois === undefined ? 'border-encre-900 bg-encre-900 text-white' : 'border-trait bg-white'}`}>Toute l’année</button>
        {NOMS.map((n, i) => <button key={n} onClick={() => setMois(i + 1)} className={`rounded-xl border py-2 text-sm font-semibold capitalize ${mois === i + 1 ? 'border-encre-900 bg-encre-900 text-white' : 'border-trait bg-white'}`}>{n.replace('.', '')}</button>)}
      </div>
      <div className="carte grid grid-cols-3 gap-2 text-center">
        <div><p className="lab">HT</p><p className="mt-1 font-extrabold">{euros(somme('ht'))}</p></div>
        <div><p className="lab">TVA</p><p className="mt-1 font-extrabold">{euros(somme('tva'))}</p></div>
        <div><p className="lab">TTC</p><p className="mt-1 font-extrabold">{euros(somme('ttc'))}</p></div>
      </div>
    </Rubrique>
  );
}

// Droits RGPD : récupérer toutes ses données, supprimer son compte
function MesDonnees() {
  const [confirmer, setConfirmer] = useState(false);
  const [saisie, setSaisie] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const exporter = () => {
    const { entreprise, tarifs, devis } = getEtat();
    telecharger(`flashdevis-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ exporte_le: new Date().toISOString(), entreprise, tarifs, devis }, null, 2));
  };
  async function supprimer() {
    setEnvoi(true); setErreur('');
    try { await supprimerCompte(); location.href = '/'; } catch (x) { setErreur(x instanceof Error ? x.message : 'Suppression impossible.'); setEnvoi(false); }
  }
  return (
    <Rubrique titre="Mes données" pied={null}>
      <div className="carte">
        <b className="block">Exporter mes données</b>
        <p className="mt-1 text-[13px] text-gris">Votre entreprise, vos tarifs, tous vos devis et factures, dans un fichier que vous gardez.</p>
        <button onClick={exporter} className="btn-secondaire mt-3 w-full">Télécharger mes données</button>
      </div>
      <div className="carte">
        <b className="block text-alerte">Supprimer mon compte</b>
        <p className="mt-1 text-[13px] text-gris">Tout est effacé définitivement, et votre abonnement est arrêté. Vos factures doivent être conservées 10 ans : exportez-les avant.</p>
        <button onClick={() => setConfirmer(true)} className="btn mt-3 w-full border border-alerte/30 text-alerte">Supprimer mon compte</button>
      </div>
      <Feuille ouverte={confirmer} fermer={() => setConfirmer(false)}>
        <p className="text-lg font-extrabold">Supprimer définitivement ?</p>
        <p className="mt-1 text-sm text-gris">Devis, factures, clients et tarifs seront effacés. Tapez <b className="text-encre-900">SUPPRIMER</b> pour confirmer.</p>
        <input className="champ mt-3" value={saisie} onChange={ev => setSaisie(ev.target.value)} autoCapitalize="characters" />
        <button onClick={exporter} className="btn-secondaire mt-3 w-full">Télécharger mes données d’abord</button>
        <button onClick={supprimer} disabled={saisie.trim().toUpperCase() !== 'SUPPRIMER' || envoi} className="btn mt-2 w-full bg-alerte text-white">{envoi ? 'Suppression…' : 'Supprimer mon compte'}</button>
        {erreur && <p role="alert" className="mt-2 text-sm text-alerte">{erreur}</p>}
      </Feuille>
    </Rubrique>
  );
}

const Rubrique = ({ titre, children, pied }: { titre: string; children: ReactNode; pied: ReactNode | null }) => (
  <div>
    <Link to="/app/profil" className="mb-3 mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-gris"><IcRetour className="h-5 w-5" />Profil</Link>
    <h1 className="titre-page mb-4">{titre}</h1>
    <div className="space-y-4">{children}</div>
    <div className="mt-6">{pied}</div>
  </div>
);

export function RubriqueProfil() {
  const { section } = useParams();
  if (section === 'tarifs') return <FormTarifs />;
  if (section === 'donnees') return <MesDonnees />;
  if (section === 'comptable') return <ExportComptable />;
  if (section === 'entreprise' || section === 'tva' || section === 'paiement') return <FormEntreprise key={section} section={section} />;
  return <Navigate to="/app/profil" replace />;
}
