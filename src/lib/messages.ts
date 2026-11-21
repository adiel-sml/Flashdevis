// Messages au client (envoi, relances) : partage du téléphone si disponible, sinon e-mail
import { euros } from './calcul';
import { ttc, ttcAcompte } from './suivi';
import type { Devis, Entreprise } from './types';

export const lienSignature = (d: Devis) => `${location.origin}/s/${d.jeton ?? d.id}`;

async function partager(d: Devis, sujet: string, texte: string) {
  if (navigator.share) { try { await navigator.share({ title: sujet, text: texte }); return true; } catch { return false; } }
  location.href = `mailto:${d.client.email}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(texte)}`;
  return true;
}
const bonjour = (d: Devis) => `Bonjour${d.client.nom ? ` ${d.client.nom}` : ''},`;

export const envoyerDevis = (d: Devis, e: Entreprise) =>
  partager(d, `Devis ${d.numero} · ${e.nom}`, `${bonjour(d)}\n\nVoici votre devis ${d.numero} « ${d.titre} » d’un montant de ${euros(ttc(d, e.regimeTva))}.\nVous pouvez le consulter et le signer en ligne : ${lienSignature(d)}\n\nCordialement,\n${e.nom}`);

export const relancerDevis = (d: Devis, e: Entreprise) =>
  partager(d, `Votre devis ${d.numero}`, `${bonjour(d)}\n\nJe reviens vers vous au sujet du devis ${d.numero} « ${d.titre} ». Avez-vous pu le consulter ? Je reste disponible pour en parler ou l’ajuster.\nLe devis est ici : ${lienSignature(d)}\n\nCordialement,\n${e.nom}`);

export const relancerFacture = (d: Devis, e: Entreprise) =>
  partager(d, `Rappel : facture ${d.facture!.numero}`, `${bonjour(d)}\n\nSauf erreur de ma part, la facture ${d.facture!.numero} de ${euros(ttc(d, e.regimeTva))} reste à régler. Pourriez-vous procéder au paiement dès que possible ?\n\nMerci d’avance,\n${e.nom}`);

export const relancerAcompte = (d: Devis, e: Entreprise) =>
  partager(d, `Rappel : acompte ${d.acompte!.numero}`, `${bonjour(d)}\n\nPour lancer les travaux « ${d.titre} », je reste dans l’attente du règlement de l’acompte (facture ${d.acompte!.numero}, ${euros(ttcAcompte(d, e.regimeTva))}).\n\nMerci d’avance,\n${e.nom}`);
