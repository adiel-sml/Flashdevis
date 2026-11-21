import { describe, expect, it } from 'vitest';
import { totalTtc } from './notifier-signature';
import { totaux } from '../src/lib/calcul';

describe('e-mail de signature', () => {
  it('le montant annoncé est le même que dans l’appli', () => {
    const lignes = [{ id: 'a', designation: 'x', quantite: 3, unite: 'u', prixUnitaireHt: 33.33, tauxTva: 10, estimation: false }, { id: 'b', designation: 'y', quantite: 1.5, unite: 'h', prixUnitaireHt: 55, tauxTva: 20, estimation: false }];
    expect(totalTtc(lignes, 'normal')).toBe(totaux(lignes, 'normal').ttc);
    expect(totalTtc(lignes, 'franchise')).toBe(totaux(lignes, 'franchise').ttc);
  });
});
