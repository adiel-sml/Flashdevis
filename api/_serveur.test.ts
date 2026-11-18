import { describe, expect, it } from 'vitest';
import { planDepuisStatut } from './_serveur';

describe('abonnement', () => {
  it('essai, actif et retard de paiement gardent Pro ; le reste repasse en gratuit', () => {
    expect(['trialing', 'active', 'past_due'].map(planDepuisStatut)).toEqual(['pro', 'pro', 'pro']);
    expect(['canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused', null].map(planDepuisStatut)).toEqual(Array(6).fill('gratuit'));
  });
});
