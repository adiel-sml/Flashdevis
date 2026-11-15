import { describe, expect, it } from 'vitest';
import { acompte, prochainNumero, totaux } from './calcul';
import type { Ligne } from './types';

const l = (quantite: number, prix: number, tva: number): Ligne => ({ id: Math.random().toString(), designation: 'x', quantite, unite: 'u', prixUnitaireHt: prix, tauxTva: tva, estimation: false });

describe('totaux', () => {
  it('additionne le HT et ventile la TVA par taux', () => {
    const t = totaux([l(6, 45, 10), l(1, 120, 10), l(2, 19.99, 20)], 'normal');
    expect(t.ht).toBe(429.98);
    expect(t.tva).toEqual([{ taux: 20, base: 39.98, montant: 8 }, { taux: 10, base: 390, montant: 39 }]);
    expect(t.totalTva).toBe(47);
    expect(t.ttc).toBe(476.98);
  });
  it('ne facture pas de TVA en franchise', () => {
    const t = totaux([l(3, 100, 20)], 'franchise');
    expect(t).toEqual({ ht: 300, tva: [], totalTva: 0, ttc: 300 });
  });
  it('calcule un acompte arrondi au centime', () => {
    expect(acompte(476.98, 30)).toBe(143.09);
  });
});

describe('prochainNumero', () => {
  it('continue la séquence de l’année sans trou', () => {
    expect(prochainNumero('D', 2026, ['D-2026-0001', 'D-2026-0007', 'D-2025-0099', 'F-2026-0003'])).toBe('D-2026-0008');
    expect(prochainNumero('F', 2027, ['F-2026-0003'])).toBe('F-2027-0001');
  });
});
