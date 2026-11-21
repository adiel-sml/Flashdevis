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

describe('acompte', () => {
  it('part au prorata de chaque taux, et solde qui retombe exactement sur le total', async () => {
    const { partAcompte, solde, totaux } = await import('./calcul');
    const t = totaux([{ id: 'a', designation: 'x', quantite: 3, unite: 'u', prixUnitaireHt: 33.33, tauxTva: 10, estimation: false }, { id: 'b', designation: 'y', quantite: 1, unite: 'u', prixUnitaireHt: 101, tauxTva: 20, estimation: false }], 'normal');
    const p = partAcompte(t, 30), s = solde(t, p);
    expect(p.ht).toBe(60.3); expect(p.tva.map(v => v.montant)).toEqual([6.06, 3]);
    expect(Math.round((p.ttc + s.ttc) * 100)).toBe(Math.round(t.ttc * 100));
    expect(Math.round((p.ht + s.ht) * 100)).toBe(Math.round(t.ht * 100));
  });
});
