// Fonction serveur : prévient l'artisan par e-mail (Brevo) quand son client vient de signer un devis.
// Appelée par la page de signature ; la base garantit un seul e-mail par devis signé, quel que soit le nombre d'appels.
import { admin, origine, type Req, type Res } from './_serveur.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ar = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
interface Ligne { quantite: number; prixUnitaireHt: number; tauxTva: number }
// Même calcul que l'appli : TVA arrondie par taux
export function totalTtc(lignes: Ligne[], regime: string) {
  const ht = ar(lignes.reduce((s, l) => s + ar(l.quantite * l.prixUnitaireHt), 0));
  if (regime === 'franchise') return ht;
  const parTaux = new Map<number, number>();
  for (const l of lignes) parTaux.set(l.tauxTva, (parTaux.get(l.tauxTva) ?? 0) + ar(l.quantite * l.prixUnitaireHt));
  return ar(ht + [...parTaux].reduce((s, [t, b]) => s + ar((b * t) / 100), 0));
}
const echapper = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ erreur: 'Méthode non autorisée' });
  const { BREVO_API_KEY, BREVO_EXPEDITEUR } = process.env;
  if (!BREVO_API_KEY || !BREVO_EXPEDITEUR || !process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(200).json({ envoye: false });
  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as { jeton?: string } | undefined;
  if (!body?.jeton || !UUID.test(body.jeton)) return res.status(400).json({ erreur: 'Lien invalide' });

  const db = admin();
  const { data: d, error } = await db.rpc('reserver_notification_signature', { p_jeton: body.jeton });
  if (error) { console.error('Notification de signature :', error.message); return res.status(200).json({ envoye: false }); }
  if (!d?.email) return res.status(200).json({ envoye: false });   // pas signé, déjà prévenu ou pas d'adresse

  const montant = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totalTtc(d.lignes ?? [], d.regime));
  const qui = echapper(d.signataire || d.client || 'Votre client'), lien = `${origine(req)}/app/devis/${d.id}`;
  const html = `<div style="font-family:Arial,sans-serif;color:#111827;max-width:480px">
    <p style="font-size:20px;font-weight:bold;margin:0 0 12px">${qui} a signé votre devis</p>
    <p style="margin:0 0 4px">${echapper(d.titre)} · ${echapper(d.numero)}</p>
    <p style="font-size:26px;font-weight:bold;margin:0 0 20px">${montant}</p>
    <p><a href="${lien}" style="background:#f5a800;color:#111827;padding:12px 20px;border-radius:12px;font-weight:bold;text-decoration:none">Voir le devis</a></p>
    <p style="color:#7a808c;font-size:13px;margin-top:20px">Prochaine étape : facturer l’acompte, ou le solde une fois les travaux faits.</p></div>`;
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST', headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: { name: 'FlashDevis', email: BREVO_EXPEDITEUR }, to: [{ email: d.email }], subject: `${d.signataire || d.client || 'Votre client'} a signé votre devis ${d.numero}`, htmlContent: html }),
  }).catch(() => null);
  if (!r?.ok) {
    console.error('Brevo :', r?.status, await r?.text().catch(() => ''));
    await db.rpc('liberer_notification_signature', { p_jeton: body.jeton });   // on pourra réessayer
    return res.status(502).json({ envoye: false });
  }
  return res.status(200).json({ envoye: true });
}
