// Fonction serveur : supprime le compte de l'artisan connecté (droit à l'effacement).
// L'abonnement Stripe est arrêté d'abord, puis le compte est effacé : ses données suivent (suppression en cascade dans la base).
import Stripe from 'stripe';
import { admin, utilisateur, type Req, type Res } from './_serveur.js';

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'DELETE') return res.status(405).json({ erreur: 'Méthode non autorisée' });
  const user = await utilisateur(req);
  if (!user) return res.status(401).json({ erreur: 'Connectez-vous pour supprimer votre compte.' });
  const db = admin();
  const { data: ent } = await db.from('entreprises').select('stripe_customer_id').eq('user_id', user.id).single();

  if (ent?.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    try {
      const abos = await stripe.subscriptions.list({ customer: ent.stripe_customer_id, status: 'all', limit: 20 });
      for (const a of abos.data) if (!['canceled', 'incomplete_expired'].includes(a.status)) await stripe.subscriptions.cancel(a.id);
    } catch (e) {
      // client de l'autre mode (test ou live) : rien à arrêter avec cette clé ; toute autre erreur bloque, pour ne pas laisser un abonnement payant actif
      if ((e as { code?: string }).code !== 'resource_missing') { console.error('Suppression, Stripe :', e instanceof Error ? e.message : e); return res.status(502).json({ erreur: 'Impossible d’arrêter votre abonnement pour le moment. Réessayez dans un instant.' }); }
    }
  }
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) { console.error('Suppression du compte :', error.message); return res.status(500).json({ erreur: 'Suppression impossible. Réessayez.' }); }
  return res.status(200).json({ supprime: true });
}
