import { describe, expect, it } from 'vitest';
import { actions, clients, conformite, enJeu, signature, signeParMois, statutAffiche, tarifsEvoques } from './suivi';
import type { Devis } from './types';

const J = 86_400_000, MAINTENANT = new Date('2026-11-18T10:00:00Z').getTime();
const il = (j: number) => new Date(MAINTENANT - j * J).toISOString();
const devis = (o: Partial<Devis>): Devis => ({ id: Math.random().toString(), numero: 'D-2026-0001', titre: 'Chantier', client: { nom: 'Mme Leroy', adresse: '', email: '', telephone: '' },
  lignes: [{ id: 'l', designation: 'Pose', quantite: 1, unite: 'u', prixUnitaireHt: 100, tauxTva: 20, estimation: false }], remarques: '', dateCreation: il(20), statut: 'brouillon', ...o });

describe('suivi', () => {
  it('statut parlant avec ancienneté', () => {
    expect(statutAffiche(devis({ statut: 'envoye', envoyeLe: il(9) }), MAINTENANT)).toEqual({ libelle: 'Envoyé · 9 j', ton: 'bleu' });
    expect(statutAffiche(devis({ statut: 'facture', facture: { numero: 'F-2026-0001', date: il(34), payee: false } }), MAINTENANT)).toEqual({ libelle: 'Impayée 34 j', ton: 'rouge' });
    expect(statutAffiche(devis({ statut: 'facture', facture: { numero: 'F-2026-0001', date: il(3), payee: false } }), MAINTENANT).libelle).toBe('Facturée');
    expect(statutAffiche(devis({ statut: 'facture', facture: { numero: 'F-2026-0001', date: il(40), payee: true } }), MAINTENANT).libelle).toBe('Payée');
  });
  it('actions triées : impayé, puis à facturer, puis devis à relancer ; rien pour un devis récent', () => {
    const a = actions([
      devis({ statut: 'envoye', envoyeLe: il(2) }),
      devis({ statut: 'envoye', envoyeLe: il(9), numero: 'D-2026-0041' }),
      devis({ statut: 'signe', signature: { nom: 'x', date: il(1), image: '' } }),
      devis({ statut: 'facture', facture: { numero: 'F-2026-0012', date: il(34), payee: false } }),
    ], 'normal', MAINTENANT);
    expect(a.map(x => x.type)).toEqual(['relancer-facture', 'facturer', 'relancer-devis']);
    expect(a[0].titre).toBe('Facture F-0012 · Mme Leroy');
  });
  it('argent en jeu par étape (TTC)', () => {
    const r = enJeu([devis({ statut: 'envoye' }), devis({ statut: 'signe' }), devis({ statut: 'facture', facture: { numero: 'F', date: il(1), payee: false } }), devis({ statut: 'facture', facture: { numero: 'F', date: il(1), payee: true } })], 'normal');
    expect(r).toEqual({ attente: 120, aFacturer: 120, impaye: 120, nb: 3, total: 360 });
  });
  it('chiffre signé par mois et taux de signature', () => {
    const liste = [devis({ statut: 'signe', envoyeLe: il(5), signature: { nom: 'x', date: il(1), image: '' } }), devis({ statut: 'envoye' }), devis({})];
    const m = signeParMois(liste, 'franchise', 6, new Date(MAINTENANT));
    expect(m).toHaveLength(6); expect(m[5]).toEqual({ mois: '2026-11', total: 100 });
    expect(signature(liste)).toEqual({ envoyes: 2, signes: 1, delaiMoyen: 4 });
  });
  it('clients regroupés par nom, montant dû', () => {
    const c = clients([devis({ statut: 'facture', facture: { numero: 'F', date: il(1), payee: false } }), devis({ client: { nom: 'mme  leroy', adresse: '', email: '', telephone: '0600' } })], 'normal');
    expect(c).toHaveLength(1); expect(c[0].du).toBe(120); expect(c[0].telephone).toBe('0600');
  });
  it('prix habituels évoqués dans la dictée', () => {
    const t = tarifsEvoques('Remplacement du ballon d’eau chaude, groupe de sécurité neuf', [{ designation: 'Ballon 200 L' }, { designation: 'Groupe de sécurité' }, { designation: 'Peinture plafond' }]);
    expect(t.map(x => x.designation)).toEqual(['Groupe de sécurité', 'Ballon 200 L']);
  });
  it('conformité du profil', () => {
    const c = conformite({ nom: 'Karim', siret: '123 456 789 00012', adresse: 'Créteil', assurance: '', regimeTva: 'franchise', numeroTva: '' });
    expect(c.faits).toBe(4); expect(c.premier?.manque).toBe('l’assurance décennale ou RC pro');
  });
});

describe('acompte dans le suivi', () => {
  const sig = { nom: 'x', date: il(10), image: '' };
  it('statut, argent en jeu et relance d’un acompte impayé', () => {
    const d = devis({ statut: 'signe', signature: sig, acompte: { numero: 'F-2026-0005', date: il(9), pct: 30, payee: false } });
    expect(statutAffiche(d, MAINTENANT)).toEqual({ libelle: 'Acompte impayé 9 j', ton: 'rouge' });
    expect(enJeu([d], 'franchise')).toEqual({ attente: 0, aFacturer: 70, impaye: 30, nb: 1, total: 100 });
    expect(actions([d], 'franchise', MAINTENANT).map(a => a.type)).toEqual(['relancer-acompte', 'facturer']);
  });
  it('facture finale : seul le solde reste dû quand l’acompte est payé', () => {
    const d = devis({ statut: 'facture', signature: sig, acompte: { numero: 'F-1', date: il(9), pct: 30, payee: true }, facture: { numero: 'F-2', date: il(1), payee: false } });
    expect(enJeu([d], 'franchise').impaye).toBe(70);
  });
});

describe('tableau de bord', () => {
  it('encaissé par mois : acompte et solde à leur date de paiement', async () => {
    const { encaisseParMois, parcours } = await import('./suivi');
    const d = devis({ statut: 'facture', acompte: { numero: 'F-1', date: il(40), pct: 30, payee: true, payeeLe: '2026-10-10T10:00:00Z' }, facture: { numero: 'F-2', date: il(5), payee: true }, payeeLe: '2026-11-15T10:00:00Z' });
    const m = encaisseParMois([d], 'franchise', 2, new Date(MAINTENANT));
    expect(m).toEqual([{ mois: '2026-10', total: 30 }, { mois: '2026-11', total: 70 }]);
    expect(parcours([d, devis({}), devis({ statut: 'envoye' })])).toEqual({ envoyes: 2, signes: 1, factures: 1, payes: 1 });
  });
});
