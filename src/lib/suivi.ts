// Suivi commercial : statut parlant de chaque devis, actions à faire, chiffres du tableau de bord, clients.
import { partAcompte, totaux } from './calcul';
import type { Devis, RegimeTva } from './types';

export const JOUR = 86_400_000;
export const RELANCE_DEVIS_J = 7;     // un devis envoyé sans réponse depuis 7 jours est à relancer
export const RELANCE_FACTURE_J = 15;  // une facture impayée depuis 15 jours est à relancer
export const QUOTA_GRATUIT = 3;

export const jours = (depuis: string | undefined, maintenant = Date.now()) => (depuis ? Math.max(0, Math.floor((maintenant - new Date(depuis).getTime()) / JOUR)) : 0);
export const dateEnvoi = (d: Devis) => d.envoyeLe ?? d.dateCreation;
export const ttc = (d: Devis, regime: RegimeTva) => totaux(d.lignes, regime).ttc;
// Montant TTC de la facture d'acompte (0 sans acompte), et ce qui reste dû sur le devis
export const ttcAcompte = (d: Devis, regime: RegimeTva) => (d.acompte ? partAcompte(totaux(d.lignes, regime), d.acompte.pct).ttc : 0);
export const resteDu = (d: Devis, regime: RegimeTva) => { const e = etape(d); return (e === 'facture' ? ttc(d, regime) - (d.acompte?.payee ? ttcAcompte(d, regime) : 0) : 0) + (e !== 'facture' && d.acompte && !d.acompte.payee ? ttcAcompte(d, regime) : 0); };

export type Ton = 'rouge' | 'bleu' | 'vert' | 'neutre' | 'jaune';
export type Etape = 'brouillon' | 'envoye' | 'signe' | 'facture' | 'payee' | 'refuse';

export const etape = (d: Devis): Etape => (d.facture?.payee ? 'payee' : d.facture ? 'facture' : d.statut);

// Libellé court et couleur, avec l'ancienneté quand elle compte (« Impayée 34 j », « Envoyé · 9 j »)
export function statutAffiche(d: Devis, maintenant = Date.now()): { libelle: string; ton: Ton } {
  switch (etape(d)) {
    case 'payee': return { libelle: 'Payée', ton: 'neutre' };
    case 'facture': { const j = jours(d.facture!.date, maintenant); return j >= RELANCE_FACTURE_J ? { libelle: `Impayée ${j} j`, ton: 'rouge' } : { libelle: 'Facturée', ton: 'jaune' }; }
    case 'signe': {
      if (!d.acompte) return { libelle: 'Signé', ton: 'vert' };
      if (d.acompte.payee) return { libelle: 'Acompte payé', ton: 'vert' };
      const j = jours(d.acompte.date, maintenant); return j >= RELANCE_DEVIS_J ? { libelle: `Acompte impayé ${j} j`, ton: 'rouge' } : { libelle: 'Acompte facturé', ton: 'jaune' };
    }
    case 'refuse': return { libelle: 'Refusé', ton: 'neutre' };
    case 'envoye': { const j = jours(dateEnvoi(d), maintenant); return { libelle: j ? `Envoyé · ${j} j` : 'Envoyé', ton: 'bleu' }; }
    default: return { libelle: 'Brouillon', ton: 'neutre' };
  }
}

export interface Action { devis: Devis; type: 'relancer-facture' | 'relancer-acompte' | 'relancer-devis' | 'facturer' | 'envoyer'; titre: string; detail: string; bouton: string; urgence: number }

// Ce qu'il faut faire aujourd'hui, du plus urgent (argent dû depuis longtemps) au moins urgent
export function actions(devis: Devis[], regime: RegimeTva, maintenant = Date.now()): Action[] {
  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const qui = (d: Devis) => d.client.nom || 'client sans nom';
  const liste: Action[] = [];
  for (const d of devis) {
    const e = etape(d), m = fmt(ttc(d, regime));
    if (e === 'facture') { const j = jours(d.facture!.date, maintenant); if (j >= RELANCE_FACTURE_J) liste.push({ devis: d, type: 'relancer-facture', titre: `Facture ${d.facture!.numero.replace(/^F-\d{4}-/, 'F-')} · ${qui(d)}`, detail: `Impayée depuis ${j} jours · ${m}`, bouton: 'Relancer', urgence: 3000 + j }); }
    else if (e === 'signe') {
      if (d.acompte && !d.acompte.payee) { const j = jours(d.acompte.date, maintenant); if (j >= RELANCE_DEVIS_J) liste.push({ devis: d, type: 'relancer-acompte', titre: `Acompte ${d.acompte.numero.replace(/^F-\d{4}-/, 'F-')} · ${qui(d)}`, detail: `Impayé depuis ${j} jours · ${fmt(ttcAcompte(d, regime))}`, bouton: 'Relancer', urgence: 2500 + j }); }
      liste.push({ devis: d, type: 'facturer', titre: `${d.numero.replace(/^D-\d{4}-/, 'D-')} signé`, detail: `${d.titre} · ${d.acompte ? `solde ${fmt(ttc(d, regime) - ttcAcompte(d, regime))}` : m}`, bouton: 'Facturer', urgence: (d.acompte ? 500 : 2000) + jours(d.signature?.date ?? d.dateCreation, maintenant) });
    }
    else if (e === 'envoye') { const j = jours(dateEnvoi(d), maintenant); if (j >= RELANCE_DEVIS_J) liste.push({ devis: d, type: 'relancer-devis', titre: `Devis ${d.numero.replace(/^D-\d{4}-/, 'D-')} · ${qui(d)}`, detail: `Envoyé il y a ${j} jours, sans réponse`, bouton: 'Relancer', urgence: 1000 + j }); }
    else if (e === 'brouillon' && d.lignes.length) liste.push({ devis: d, type: 'envoyer', titre: `${d.titre}`, detail: `Brouillon · ${qui(d)} · ${m}`, bouton: 'Envoyer', urgence: jours(d.dateCreation, maintenant) });
  }
  return liste.sort((a, b) => b.urgence - a.urgence);
}

// Argent en jeu : en attente de signature, signé à facturer, facturé non payé
export function enJeu(devis: Devis[], regime: RegimeTva) {
  const r = { attente: 0, aFacturer: 0, impaye: 0, nb: 0 };
  for (const d of devis) {
    const e = etape(d), v = ttc(d, regime);
    const a = ttcAcompte(d, regime), du = resteDu(d, regime);
    if (e === 'envoye') r.attente += v;
    else if (e === 'signe') { r.aFacturer += v - a; r.impaye += du; }
    else if (e === 'facture' || (e === 'payee' && du > 0)) r.impaye += du;
    else continue;
    r.nb++;
  }
  return { ...r, total: r.attente + r.aFacturer + r.impaye };
}

const cleMois = (iso: string) => iso.slice(0, 7);
// Date à laquelle un devis compte comme « signé » (signature du client, sinon facture, sinon création si marqué signé à la main)
const dateSignature = (d: Devis) => (['signe', 'facture', 'payee'].includes(etape(d)) ? d.signature?.date ?? d.facture?.date ?? d.dateCreation : undefined);

// Chiffre signé par mois sur les n derniers mois (le dernier est le mois en cours)
export function signeParMois(devis: Devis[], regime: RegimeTva, n = 6, maintenant = new Date()) {
  const mois = Array.from({ length: n }, (_, i) => { const x = new Date(maintenant.getFullYear(), maintenant.getMonth() - (n - 1 - i), 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`; });
  const somme = Object.fromEntries(mois.map(m => [m, 0]));
  for (const d of devis) { const s = dateSignature(d); if (s && cleMois(s) in somme) somme[cleMois(s)] += ttc(d, regime); }
  return mois.map(m => ({ mois: m, total: somme[m] }));
}

// Sur les devis envoyés au client : part signée et délai moyen avant signature
export function signature(devis: Devis[]) {
  const envoyes = devis.filter(d => d.statut !== 'brouillon');
  const signes = envoyes.filter(d => dateSignature(d));
  const delais = signes.filter(d => d.signature).map(d => (new Date(d.signature!.date).getTime() - new Date(dateEnvoi(d)).getTime()) / JOUR);
  return { envoyes: envoyes.length, signes: signes.length, delaiMoyen: delais.length ? Math.max(0, Math.round(delais.reduce((a, b) => a + b, 0) / delais.length)) : null };
}

export const devisDuMois = (devis: Devis[], maintenant = new Date()) => devis.filter(d => cleMois(d.dateCreation) === cleMois(maintenant.toISOString())).length;

export const initiales = (nom: string) => nom.replace(/^(m\.|mme|mlle|mr|monsieur|madame)\s+/i, '').split(/[\s-]+/).filter(Boolean).slice(0, 2).map(m => m[0]!.toUpperCase()).join('') || '?';
export const cleClient = (nom: string) => nom.trim().toLowerCase().replace(/\s+/g, ' ');

export interface FicheClient { cle: string; nom: string; telephone: string; email: string; adresse: string; devis: Devis[]; total: number; du: number; dernier: string }

// Clients déduits des devis (même nom = même client), du plus récent au plus ancien
export function clients(devis: Devis[], regime: RegimeTva): FicheClient[] {
  const parCle = new Map<string, FicheClient>();
  for (const d of [...devis].sort((a, b) => b.dateCreation.localeCompare(a.dateCreation))) {
    if (!d.client.nom.trim()) continue;
    const cle = cleClient(d.client.nom);
    const f = parCle.get(cle) ?? { cle, nom: d.client.nom.trim(), telephone: '', email: '', adresse: '', devis: [], total: 0, du: 0, dernier: d.dateCreation };
    f.telephone ||= d.client.telephone; f.email ||= d.client.email; f.adresse ||= d.client.adresse;
    f.devis.push(d);
    const e = etape(d), v = ttc(d, regime);
    if (e === 'payee' || e === 'facture') f.total += v; else if (d.acompte) f.total += ttcAcompte(d, regime);
    f.du += resteDu(d, regime);
    parCle.set(cle, f);
  }
  return [...parCle.values()];
}

// Les prix habituels qui correspondent à ce que l'artisan est en train de dicter
export function tarifsEvoques<T extends { designation: string }>(texte: string, tarifs: T[], max = 4): T[] {
  const t = ` ${texte.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')} `;
  const mots = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(m => m.length > 3);
  return tarifs.map(x => ({ x, score: mots(x.designation).filter(m => t.includes(m)).length })).filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, max).map(s => s.x);
}

// Conformité des documents : ce qui manque dans le profil pour un devis complet
export function conformite(e: { nom: string; siret: string; adresse: string; assurance: string; regimeTva: RegimeTva; numeroTva: string }) {
  const points = [
    { ok: !!e.nom.trim(), manque: 'le nom de l’entreprise', section: 'entreprise' },
    { ok: /^\d{14}$/.test(e.siret.replace(/\s/g, '')), manque: 'le SIRET', section: 'entreprise' },
    { ok: !!e.adresse.trim(), manque: 'l’adresse', section: 'entreprise' },
    { ok: !!e.assurance.trim(), manque: 'l’assurance décennale ou RC pro', section: 'tva' },
    { ok: e.regimeTva === 'franchise' || !!e.numeroTva.trim(), manque: 'le numéro de TVA', section: 'tva' },
  ];
  return { faits: points.filter(p => p.ok).length, total: points.length, premier: points.find(p => !p.ok) };
}

// Argent réellement encaissé par mois (acomptes et factures payés, à leur date de paiement) sur les n derniers mois
export function encaisseParMois(devis: Devis[], regime: RegimeTva, n = 6, maintenant = new Date()) {
  const mois = Array.from({ length: n }, (_, i) => { const x = new Date(maintenant.getFullYear(), maintenant.getMonth() - (n - 1 - i), 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`; });
  const somme = Object.fromEntries(mois.map(m => [m, 0]));
  const ajouter = (iso: string | null | undefined, v: number) => { const m = iso?.slice(0, 7); if (m && m in somme) somme[m] += v; };
  for (const d of devis) {
    const a = ttcAcompte(d, regime);
    if (d.acompte?.payee) ajouter(d.acompte.payeeLe ?? d.acompte.date, a);
    if (d.facture?.payee) ajouter(d.payeeLe ?? d.facture.date, ttc(d, regime) - (d.acompte ? a : 0));
  }
  return mois.map(m => ({ mois: m, total: Math.round(somme[m] * 100) / 100 }));
}

// Parcours des devis : combien en sont arrivés à chaque étape
export function parcours(devis: Devis[]) {
  const e = devis.map(etape);
  return {
    envoyes: e.filter(x => x !== 'brouillon').length,
    signes: e.filter(x => x === 'signe' || x === 'facture' || x === 'payee').length,
    factures: e.filter(x => x === 'facture' || x === 'payee').length,
    payes: e.filter(x => x === 'payee').length,
  };
}
