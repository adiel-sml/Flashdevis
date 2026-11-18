// Données de l'appli. Avec Supabase : comptes, synchronisation entre appareils, règles appliquées par la base
// (numérotation, quota gratuit, factures figées). Sans Supabase : mode démo, tout reste dans le navigateur.
import { useSyncExternalStore } from 'react';
import { prochainNumero } from './calcul';
import { supabase } from './supabase';
import { entrepriseVide, type Devis, type Entreprise, type Tarif } from './types';

export interface Abonnement { statut: string | null; fin: string | null }
interface Etat { entreprise: Entreprise; tarifs: Tarif[]; devis: Devis[]; plan: 'gratuit' | 'pro'; abonnement: Abonnement; pret: boolean }
const CLE = 'flashdevis:v1';
const vide: Etat = { entreprise: entrepriseVide, tarifs: [], devis: [], plan: 'gratuit', abonnement: { statut: null, fin: null }, pret: false };

export class ErreurQuota extends Error { constructor() { super('Vous avez utilisé vos 3 devis gratuits du mois. Passez à l’offre Pro pour des devis illimités.'); } }

function lireLocal(): Etat {
  try {
    const brut = localStorage.getItem(CLE);
    if (brut) { const e = JSON.parse(brut); return { ...vide, entreprise: { ...entrepriseVide, ...e.entreprise }, tarifs: e.tarifs ?? [], devis: e.devis ?? [], pret: true }; }
  } catch { /* stockage indisponible */ }
  return { ...vide, pret: true };
}

let etat: Etat = supabase ? vide : lireLocal();
const abonnes = new Set<() => void>();
function publier(suivant: Etat) {
  etat = suivant;
  if (!supabase) { try { localStorage.setItem(CLE, JSON.stringify({ entreprise: etat.entreprise, tarifs: etat.tarifs, devis: etat.devis })); } catch { /* quota plein */ } }
  abonnes.forEach(f => f());
}

export const useEtat = () => useSyncExternalStore(f => { abonnes.add(f); return () => abonnes.delete(f); }, () => etat);
export const getEtat = () => etat;
export const id = () => crypto.randomUUID();

// ----- conversion entre la base (snake_case) et l'appli -----
type Ligne = Record<string, unknown>;
const versEntreprise = (r: Ligne): Entreprise => ({
  nom: r.nom as string, metier: r.metier as string, siret: r.siret as string, adresse: r.adresse as string, email: r.email as string, telephone: r.telephone as string,
  regimeTva: r.regime_tva as Entreprise['regimeTva'], numeroTva: r.numero_tva as string, assurance: r.assurance as string, validiteJours: Number(r.validite_jours),
  conditionsPaiement: r.conditions_paiement as string, acomptePct: Number(r.acompte_pct),
});
const depuisEntreprise = (e: Entreprise) => ({
  nom: e.nom, metier: e.metier, siret: e.siret, adresse: e.adresse, email: e.email, telephone: e.telephone, regime_tva: e.regimeTva, numero_tva: e.numeroTva,
  assurance: e.assurance, validite_jours: e.validiteJours, conditions_paiement: e.conditionsPaiement, acompte_pct: e.acomptePct,
});
const versDevis = (r: Ligne): Devis => ({
  id: r.id as string, numero: r.numero as string, titre: r.titre as string, client: r.client as Devis['client'], lignes: r.lignes as Devis['lignes'],
  remarques: r.remarques as string, dateCreation: r.cree_le as string, statut: r.statut as Devis['statut'], jeton: r.jeton_signature as string,
  signature: (r.signature as Devis['signature']) ?? undefined, facture: (r.facture as Devis['facture']) ?? undefined,
  envoyeLe: (r.envoye_le as string) ?? undefined, payeeLe: (r.payee_le as string) ?? undefined, ouvertures: Number(r.ouvertures ?? 0), ouvertLe: (r.ouvert_le as string) ?? undefined,
});
const versTarif = (r: Ligne): Tarif => ({ id: r.id as string, designation: r.designation as string, unite: r.unite as string, prixHt: Number(r.prix_ht) });
const verifier = <T,>({ data, error }: { data: T; error: { message: string } | null }) => {
  if (error) throw error.message.includes('QUOTA_GRATUIT') ? new ErreurQuota() : new Error(error.message);
  return data;
};

// Charge toutes les données du compte connecté
export async function charger() {
  if (!supabase) return;
  const [e, t, d] = await Promise.all([
    supabase.from('entreprises').select('*').single(),
    supabase.from('tarifs').select('*').order('maj_le'),
    supabase.from('devis').select('*').order('cree_le', { ascending: false }),
  ]);
  const ent = verifier(e) as Ligne;
  publier({ entreprise: versEntreprise(ent), plan: ent.plan as Etat['plan'], abonnement: { statut: (ent.abonnement_statut as string) ?? null, fin: (ent.abonnement_fin as string) ?? null }, tarifs: (verifier(t) as Ligne[]).map(versTarif), devis: (verifier(d) as Ligne[]).map(versDevis), pret: true });
}
export const vider = () => publier({ ...vide, pret: false });

export async function enregistrerEntreprise(entreprise: Entreprise) {
  if (supabase) verifier(await supabase.from('entreprises').update(depuisEntreprise(entreprise)).eq('user_id', (await supabase.auth.getUser()).data.user!.id));
  publier({ ...etat, entreprise });
}

export async function enregistrerTarifs(tarifs: Tarif[]) {
  if (supabase) {
    const garder = new Set(tarifs.map(t => t.id));
    const supprimes = etat.tarifs.filter(t => !garder.has(t.id)).map(t => t.id);
    if (supprimes.length) verifier(await supabase.from('tarifs').delete().in('id', supprimes));
    if (tarifs.length) verifier(await supabase.from('tarifs').upsert(tarifs.map(t => ({ id: t.id, designation: t.designation, unite: t.unite, prix_ht: t.prixHt, maj_le: new Date().toISOString() }))));
  }
  publier({ ...etat, tarifs });
}

// Crée ou modifie un devis ; renvoie le devis tel qu'enregistré (numéro attribué par la base)
export async function enregistrerDevis(d: Devis): Promise<Devis> {
  const existe = etat.devis.some(x => x.id === d.id);
  let final = d;
  if (supabase) {
    const champs = { titre: d.titre, client: d.client, lignes: d.lignes, remarques: d.remarques, statut: d.statut, ...(d.facture ? { facture: d.facture } : {}) };
    const r = existe ? await supabase.from('devis').update(champs).eq('id', d.id).select().single() : await supabase.from('devis').insert({ id: d.id, ...champs }).select().single();
    final = versDevis(verifier(r) as Ligne);
  } else {
    // mode démo : les dates de suivi sont posées ici (avec Supabase, c'est la base qui s'en charge)
    const avant = etat.devis.find(x => x.id === d.id), maintenant = new Date().toISOString();
    final = { ...d, envoyeLe: avant?.envoyeLe ?? (d.statut === 'envoye' ? maintenant : undefined), payeeLe: d.facture?.payee ? (avant?.payeeLe ?? maintenant) : undefined };
    if (!existe) final = { ...final, numero: prochainNumero('D', new Date().getFullYear(), etat.devis.map(x => x.numero)), jeton: d.id };
  }
  publier({ ...etat, devis: existe ? etat.devis.map(x => (x.id === final.id ? final : x)) : [final, ...etat.devis] });
  return final;
}

export async function facturerDevis(d: Devis): Promise<Devis> {
  let final: Devis;
  if (supabase) final = versDevis(verifier(await supabase.rpc('facturer_devis', { p_devis: d.id })) as Ligne);
  else final = { ...d, statut: 'facture', facture: { numero: prochainNumero('F', new Date().getFullYear(), etat.devis.flatMap(x => (x.facture ? [x.facture.numero] : []))), date: new Date().toISOString(), payee: false } };
  publier({ ...etat, devis: etat.devis.map(x => (x.id === final.id ? final : x)) });
  return final;
}

// Le client ouvre son lien de signature (compté par la base ; sans le script 0002, l'appel échoue sans gêner)
export async function noterOuverture(jeton: string) {
  if (supabase) await supabase.rpc('noter_ouverture', { p_jeton: jeton }).then(() => undefined, () => undefined);
}

export async function supprimerDevis(idDevis: string) {
  if (supabase) verifier(await supabase.from('devis').delete().eq('id', idDevis));
  publier({ ...etat, devis: etat.devis.filter(d => d.id !== idDevis) });
}

// Mémorise les prix confirmés par l'artisan, pour que les prochains devis les reprennent
export async function apprendreTarifs(lignes: { designation: string; unite: string; prixUnitaireHt: number }[]) {
  const tarifs = [...etat.tarifs];
  for (const l of lignes) {
    const cle = l.designation.trim().toLowerCase();
    if (!cle || l.prixUnitaireHt <= 0) continue;
    const i = tarifs.findIndex(t => t.designation.trim().toLowerCase() === cle);
    const t = { id: i >= 0 ? tarifs[i].id : id(), designation: l.designation.trim(), unite: l.unite, prixHt: l.prixUnitaireHt };
    if (i >= 0) tarifs[i] = t; else tarifs.push(t);
  }
  await enregistrerTarifs(tarifs.slice(-200));
}
