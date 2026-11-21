import { describe, expect, it } from 'vitest';
import { metierDepuisNaf, versEntreprise } from './registre';

describe('registre des entreprises', () => {
  it('métier déduit du code d’activité', () => {
    expect(metierDepuisNaf('43.22A')).toBe('Plombier chauffagiste');
    expect(metierDepuisNaf('43.21A')).toBe('Électricien');
    expect(metierDepuisNaf('62.01Z')).toBe('');
  });
  it('fiche préremplie depuis un résultat du registre', () => {
    expect(versEntreprise({ nom_complet: 'KARIM PLOMBERIE (DUPONT KARIM)', siren: '123456789', siege: { siret: '12345678900012', adresse: '8 RUE PASTEUR 94000 CRETEIL', activite_principale: '43.22A' } }))
      .toEqual({ nom: 'KARIM PLOMBERIE', siren: '123456789', siret: '12345678900012', adresse: '8 RUE PASTEUR 94000 CRETEIL', metier: 'Plombier chauffagiste' });
  });
});
