import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Avatar, EnTete } from '../components/Elements';
import { IcBatiment, IcBouclier, IcCarte, IcChevron, IcCorbeille, IcListe, IcPlus, IcRetour } from '../components/Icones';
import { allerVersStripe, attendrePro } from '../lib/abonnement';
import { enregistrerEntreprise, enregistrerTarifs, id, useEtat } from '../lib/store';
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
        <Avatar nom={e.nom || 'Mon entreprise'} taille="h-14 w-14 text-xl" sombre />
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
        <Link to="/" className="flex items-center px-3.5 py-3.5 text-[14.5px] font-semibold">Découvrir FlashDevis<IcChevron className="ml-auto h-4 w-4 text-[#c0b9ab]" /></Link>
        {supabase && <button onClick={() => supabase!.auth.signOut()} className="w-full border-t border-[#f0ece4] px-3.5 py-3.5 text-left text-[14.5px] font-semibold text-alerte">Se déconnecter</button>}
      </div>
    </div>
  );
}

// ----- Rubriques du profil : un formulaire court par sujet -----
const Champ = ({ lib, children, aide }: { lib: string; children: ReactNode; aide?: string }) => <label className="block"><span className="etiquette">{lib}</span>{children}{aide && <span className="mt-1 block text-xs text-gris">{aide}</span>}</label>;

function FormEntreprise({ section }: { section: 'entreprise' | 'tva' | 'paiement' }) {
  const etat = useEtat();
  const nav = useNavigate();
  const [e, setE] = useState<Entreprise>(etat.entreprise);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const txt = (k: keyof Entreprise, props: Record<string, unknown> = {}) => <input className="champ" value={String(e[k])} onChange={ev => setE({ ...e, [k]: ev.target.value })} {...props} />;
  const num = (k: 'validiteJours' | 'acomptePct') => <input className="champ" inputMode="numeric" value={e[k]} onChange={ev => setE({ ...e, [k]: Number(ev.target.value.replace(/\D/g, '')) || 0 })} />;
  async function enregistrer() {
    setEnvoi(true); setErreur('');
    try { await enregistrerEntreprise(e); nav('/app/profil'); } catch { setErreur('Enregistrement impossible. Vérifiez votre connexion et réessayez.'); } finally { setEnvoi(false); }
  }
  const titres = { entreprise: 'Entreprise', tva: 'TVA et assurance', paiement: 'Paiement et acompte' };
  return (
    <Rubrique titre={titres[section]} pied={<><button onClick={enregistrer} disabled={envoi} className="btn-primaire w-full py-3.5 text-base">{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>{erreur && <p role="alert" className="mt-2 text-sm text-alerte">{erreur}</p>}</>}>
      {section === 'entreprise' && <>
        <Champ lib="Nom ou raison sociale">{txt('nom')}</Champ>
        <Champ lib="Métier">{txt('metier', { placeholder: 'Plombier chauffagiste' })}</Champ>
        <Champ lib="SIRET" aide="14 chiffres, obligatoire sur vos devis.">{txt('siret', { inputMode: 'numeric' })}</Champ>
        <Champ lib="Adresse">{txt('adresse')}</Champ>
        <Champ lib="Téléphone">{txt('telephone', { inputMode: 'tel' })}</Champ>
        <Champ lib="E-mail">{txt('email', { type: 'email' })}</Champ>
      </>}
      {section === 'tva' && <>
        <div className="grid grid-cols-2 gap-2">{([['normal', 'Assujetti à la TVA'], ['franchise', 'Franchise (micro)']] as const).map(([v, lib]) => (
          <button key={v} onClick={() => setE({ ...e, regimeTva: v })} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${e.regimeTva === v ? 'border-encre-900 bg-encre-900 text-white' : 'border-trait bg-white'}`}>{lib}</button>
        ))}</div>
        {e.regimeTva === 'normal' ? <Champ lib="N° de TVA intracommunautaire">{txt('numeroTva', { placeholder: 'FR12 345678901' })}</Champ> : <p className="text-[13px] text-gris">La mention « TVA non applicable, art. 293 B du CGI » est ajoutée à vos documents.</p>}
        <Champ lib="Assurance décennale ou RC pro" aide="Obligatoire sur les devis du bâtiment : assureur, n° de contrat, zone couverte.">{txt('assurance')}</Champ>
      </>}
      {section === 'paiement' && <>
        <Champ lib="Acompte demandé (%)">{num('acomptePct')}</Champ>
        <Champ lib="Validité des devis (jours)">{num('validiteJours')}</Champ>
        <Champ lib="Conditions de paiement"><textarea className="champ min-h-24" value={e.conditionsPaiement} onChange={ev => setE({ ...e, conditionsPaiement: ev.target.value })} /></Champ>
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
    <Rubrique titre="Mes tarifs" pied={<><button onClick={enregistrer} className="btn-primaire w-full py-3.5 text-base">Enregistrer</button>{erreur && <p role="alert" className="mt-2 text-sm text-alerte">{erreur}</p>}</>}>
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

const Rubrique = ({ titre, children, pied }: { titre: string; children: ReactNode; pied: ReactNode }) => (
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
  if (section === 'entreprise' || section === 'tva' || section === 'paiement') return <FormEntreprise key={section} section={section} />;
  return <Navigate to="/app/profil" replace />;
}
