// Calculs du devis : montants HT, TVA par taux, TTC, acompte. Les montants sont arrondis au centime.
import type { Ligne, RegimeTva } from './types';

export const arrondi = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const totalLigne = (l: Ligne) => arrondi(l.quantite * l.prixUnitaireHt);

export interface Totaux {
  ht: number;
  tva: { taux: number; base: number; montant: number }[];
  totalTva: number;
  ttc: number;
}

export function totaux(lignes: Ligne[], regime: RegimeTva): Totaux {
  const ht = arrondi(lignes.reduce((s, l) => s + totalLigne(l), 0));
  if (regime === 'franchise') return { ht, tva: [], totalTva: 0, ttc: ht };
  const parTaux = new Map<number, number>();
  for (const l of lignes) parTaux.set(l.tauxTva, (parTaux.get(l.tauxTva) ?? 0) + totalLigne(l));
  const tva = [...parTaux.entries()]
    .filter(([taux]) => taux > 0)
    .sort((a, b) => b[0] - a[0])
    .map(([taux, base]) => ({ taux, base: arrondi(base), montant: arrondi((base * taux) / 100) }));
  const totalTva = arrondi(tva.reduce((s, t) => s + t.montant, 0));
  return { ht, tva, totalTva, ttc: arrondi(ht + totalTva) };
}

export const acompte = (ttc: number, pct: number) => arrondi((ttc * pct) / 100);

export const euros = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

// Numérotation chronologique et sans trou, exigée pour les factures : préfixe-année-compteur
export function prochainNumero(prefixe: 'D' | 'F', annee: number, existants: string[]) {
  const debut = `${prefixe}-${annee}-`;
  const max = existants.filter(n => n.startsWith(debut)).reduce((m, n) => Math.max(m, Number(n.slice(debut.length)) || 0), 0);
  return `${debut}${String(max + 1).padStart(4, '0')}`;
}
