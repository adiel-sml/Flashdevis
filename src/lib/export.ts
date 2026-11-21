// Export comptable : une ligne par facture (factures d'acompte et factures finales, acompte déduit), au format CSV pour Excel
import { partAcompte, solde, totaux, type Totaux } from './calcul';
import type { Devis, RegimeTva } from './types';

export interface LigneCompta { date: string; numero: string; type: 'Facture' | 'Facture d’acompte'; devis: string; client: string; ht: number; tva: number; ttc: number; payee: boolean; payeeLe?: string | null }

export function lignesComptables(devis: Devis[], regime: RegimeTva, periode: { annee: number; mois?: number }): LigneCompta[] {
  const dans = (iso: string) => { const d = new Date(iso); return d.getFullYear() === periode.annee && (periode.mois === undefined || d.getMonth() + 1 === periode.mois); };
  const ligne = (d: Devis, t: Totaux, x: Omit<LigneCompta, 'devis' | 'client' | 'ht' | 'tva' | 'ttc'>): LigneCompta => ({ ...x, devis: d.numero, client: d.client.nom, ht: t.ht, tva: t.totalTva, ttc: t.ttc });
  const out: LigneCompta[] = [];
  for (const d of devis) {
    const t = totaux(d.lignes, regime), part = d.acompte ? partAcompte(t, d.acompte.pct) : undefined;
    if (d.acompte && part && dans(d.acompte.date)) out.push(ligne(d, part, { date: d.acompte.date, numero: d.acompte.numero, type: 'Facture d’acompte', payee: d.acompte.payee, payeeLe: d.acompte.payeeLe }));
    if (d.facture && dans(d.facture.date)) out.push(ligne(d, part ? solde(t, part) : t, { date: d.facture.date, numero: d.facture.numero, type: 'Facture', payee: d.facture.payee, payeeLe: d.payeeLe }));
  }
  return out.sort((a, b) => a.numero.localeCompare(b.numero));
}

const nombre = (n: number) => n.toFixed(2).replace('.', ',');
const jour = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '');
const cellule = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export function csv(lignes: LigneCompta[]) {
  const entete = ['Date', 'Numéro', 'Type', 'Devis', 'Client', 'Montant HT', 'TVA', 'Montant TTC', 'Payée', 'Date de paiement'];
  const corps = lignes.map(l => [jour(l.date), l.numero, l.type, l.devis, l.client, nombre(l.ht), nombre(l.tva), nombre(l.ttc), l.payee ? 'oui' : 'non', jour(l.payeeLe)].map(cellule).join(';'));
  return '﻿' + [entete.join(';'), ...corps].join('\r\n') + '\r\n';   // BOM : Excel lit les accents
}
