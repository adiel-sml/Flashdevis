import { describe, expect, it } from 'vitest';
import { csv, lignesComptables } from './export';
import type { Devis } from './types';

const d: Devis = { id: '1', numero: 'D-2026-0001', titre: 'Salle de bain', client: { nom: 'Dupont; Fils', adresse: '', email: '', telephone: '' }, remarques: '', dateCreation: '2026-10-01T10:00:00Z', statut: 'facture',
  lignes: [{ id: 'l', designation: 'Pose', quantite: 1, unite: 'u', prixUnitaireHt: 1000, tauxTva: 10, estimation: false }],
  acompte: { numero: 'F-2026-0001', date: '2026-10-02T10:00:00Z', pct: 30, payee: true, payeeLe: '2026-10-05T10:00:00Z' }, facture: { numero: 'F-2026-0002', date: '2026-11-10T10:00:00Z', payee: false } };

describe('export comptable', () => {
  it('acompte et facture finale (solde), filtrés par période', () => {
    const tout = lignesComptables([d], 'normal', { annee: 2026 });
    expect(tout.map(l => [l.numero, l.type, l.ht, l.tva, l.ttc])).toEqual([['F-2026-0001', 'Facture d’acompte', 300, 30, 330], ['F-2026-0002', 'Facture', 700, 70, 770]]);
    expect(lignesComptables([d], 'normal', { annee: 2026, mois: 11 }).map(l => l.numero)).toEqual(['F-2026-0002']);
  });
  it('CSV lisible par Excel : point-virgule, virgule décimale, champs protégés', () => {
    const c = csv(lignesComptables([d], 'normal', { annee: 2026, mois: 10 }));
    expect(c.startsWith('﻿Date;Numéro;Type')).toBe(true);
    expect(c).toContain('F-2026-0001;Facture d’acompte;D-2026-0001;"Dupont; Fils";300,00;30,00;330,00;oui;05/10/2026');
  });
});
