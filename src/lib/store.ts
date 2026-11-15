// Stockage des données. Version 1 : dans le navigateur (mode démo, aucun compte nécessaire).
// shortcut: localStorage seulement, données perdues si on vide le navigateur ; passer à Supabase (comptes, sync) avant l'abonnement payant.
import { useSyncExternalStore } from 'react';
import { entrepriseVide, type Devis, type Entreprise, type Tarif } from './types';

interface Etat { entreprise: Entreprise; tarifs: Tarif[]; devis: Devis[] }
const CLE = 'flashdevis:v1';

function lire(): Etat {
  try {
    const brut = localStorage.getItem(CLE);
    if (brut) { const e = JSON.parse(brut) as Etat; return { entreprise: { ...entrepriseVide, ...e.entreprise }, tarifs: e.tarifs ?? [], devis: e.devis ?? [] }; }
  } catch { /* stockage indisponible : on repart d'un état vide */ }
  return { entreprise: entrepriseVide, tarifs: [], devis: [] };
}

let etat = lire();
const abonnes = new Set<() => void>();
function ecrire(suivant: Etat) {
  etat = suivant;
  try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch { /* quota plein ou navigation privée */ }
  abonnes.forEach(f => f());
}

export const useEtat = () => useSyncExternalStore(f => { abonnes.add(f); return () => abonnes.delete(f); }, () => etat);
export const getEtat = () => etat;
export const id = () => crypto.randomUUID();

export const enregistrerEntreprise = (entreprise: Entreprise) => ecrire({ ...etat, entreprise });
export const enregistrerTarifs = (tarifs: Tarif[]) => ecrire({ ...etat, tarifs });
export function enregistrerDevis(d: Devis) {
  const existe = etat.devis.some(x => x.id === d.id);
  ecrire({ ...etat, devis: existe ? etat.devis.map(x => (x.id === d.id ? d : x)) : [d, ...etat.devis] });
}
export const supprimerDevis = (idDevis: string) => ecrire({ ...etat, devis: etat.devis.filter(d => d.id !== idDevis) });

// Mémorise les prix confirmés par l'artisan, pour que les prochains devis les reprennent
export function apprendreTarifs(lignes: { designation: string; unite: string; prixUnitaireHt: number }[]) {
  const tarifs = [...etat.tarifs];
  for (const l of lignes) {
    const cle = l.designation.trim().toLowerCase();
    if (!cle || l.prixUnitaireHt <= 0) continue;
    const i = tarifs.findIndex(t => t.designation.trim().toLowerCase() === cle);
    const t = { id: i >= 0 ? tarifs[i].id : id(), designation: l.designation.trim(), unite: l.unite, prixHt: l.prixUnitaireHt };
    if (i >= 0) tarifs[i] = t; else tarifs.push(t);
  }
  enregistrerTarifs(tarifs.slice(-200));
}
