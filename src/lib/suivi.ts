// Suivi commercial : statut parlant de chaque devis, actions à faire, chiffres du tableau de bord, clients.
import { totaux } from './calcul';
import type { Devis, RegimeTva } from './types';

export const JOUR = 86_400_000;
export const RELANCE_DEVIS_J = 7;     // un devis envoyé sans réponse depuis 7 jours est à relancer
export const RELANCE_FACTURE_J = 15;  // une facture impayée depuis 15 jours est à relancer
export const QUOTA_GRATUIT = 3;

export const jours = (depuis: string | undefined, maintenant = Date.now()) => (depuis ? Math.max(0, Math.floor((maintenant - new Date(depuis).getTime()) / JOUR)) : 0);
export const dateEnvoi = (d: Devis) => d.envoyeLe ?? d.dateCreation;
export const ttc = (d: Devis, regime: RegimeTva) => totaux(d.lignes, regime).ttc;

export type Ton = 'rouge' | 'bleu' | 'vert' | 'neutre' | 'jaune';
export type Etape = 'brouillon' | 'envoye' | 'signe' | 'facture' | 'payee' | 'refuse';

export const etape = (d: Devis): Etape => (d.facture?.payee ? 'payee' : d.facture ? 'facture' : d.statut);

// Libellé court et couleur, avec l'ancienneté quand elle compte (« Impayée 34 j », « Envoyé · 9 j »)
export function statutAffiche(d: Devis, maintenant = Date.now()): { libelle: string; ton: Ton } {
  switch (etape(d)) {
    case 'payee': return { libelle: 'Payée', ton: 'neutre' };
    case 'facture': { const j = jours(d.facture!.date, maintenant); return j >= RELANCE_FACTURE_J ? { libelle: `Impayée ${j} j`, ton: 'rouge' } : { libelle: 'Facturée', ton: 'jaune' }; }
    case 'signe': return { libelle: 'Signé', ton: 'vert' };
    case 'refuse': return { libelle: 'Refusé', ton: 'neutre' };
    case 'envoye': { const j = jours(dateEnvoi(d), maintenant); return { libelle: j ? `Envoyé · ${j} j` : 'Envoyé', ton: 'bleu' }; }
    default: return { libelle: 'Brouillon', ton: 'neutre' };
  }
}

export interface Action { devis: Devis; type: 'relancer-facture' | 'relancer-devis' | 'facturer' | 'envoyer'; titre: string; detail: string; bouton: string; urgence: number }

// Ce qu'il faut faire aujourd'hui, du plus urgent (argent dû depuis longtemps) au moins urgent
export function actions(devis: Devis[], regime: RegimeTva, maintenant = Date.now()): Action[] {
  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const qui = (d: Devis) => d.client.nom || 'client sans nom';
  const liste: Action[] = [];
  for (const d of devis) {
    const e = etape(d), m = fmt(ttc(d, regime));
    if (e === 'facture') { const j = jours(d.facture!.date, maintenant); if (j >= RELANCE_FACTURE_J) liste.push({ devis: d, type: 'relancer-facture', titre: `Facture ${d.facture!.numero.replace(/^F-\d{4}-/, 'F-')} · ${qui(d)}`, detail: `Impayée depuis ${j} jours · ${m}`, bouton: 'Relancer', urgence: 3000 + j }); }
    else if (e === 'signe') liste.push({ devis: d, type: 'facturer', titre: `${d.numero.replace(/^D-\d{4}-/, 'D-')} signé`, detail: `${d.titre} · ${m}`, bouton: 'Facturer', urgence: 2000 + jours(d.signature?.date ?? d.dateCreation, maintenant) });
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
    if (e === 'envoye') r.attente += v; else if (e === 'signe') r.aFacturer += v; else if (e === 'facture') r.impaye += v; else continue;
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
    if (e === 'payee' || e === 'facture') f.total += v;
    if (e === 'facture') f.du += v;
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
