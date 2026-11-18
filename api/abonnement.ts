// Fonction serveur : ouvre la page de paiement Stripe (offre Pro, 14 jours d'essai) ou l'espace de gestion de l'abonnement.
import Stripe from 'stripe';
import { admin, origine, utilisateur, type Req, type Res } from './_serveur.js';

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ erreur: 'Méthode non autorisée' });
  const { STRIPE_SECRET_KEY, STRIPE_PRICE_ID } = process.env;
  if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID) return res.status(500).json({ erreur: 'Le paiement n’est pas encore configuré.' });
  const user = await utilisateur(req);
  if (!user) return res.status(401).json({ erreur: 'Connectez-vous pour gérer votre abonnement.' });

  const stripe = new Stripe(STRIPE_SECRET_KEY), db = admin(), site = origine(req);
  const { data: ent, error } = await db.from('entreprises').select('nom, email, stripe_customer_id, abonnement_statut').eq('user_id', user.id).single();
  if (error || !ent) return res.status(500).json({ erreur: 'Compte introuvable.' });

  try {
    // Client Stripe créé une seule fois par artisan, relié à son compte
    let client = ent.stripe_customer_id as string | null;
    if (!client) {
      const c = await stripe.customers.create({ email: ent.email || user.email, name: ent.nom || undefined, metadata: { user_id: user.id } });
      client = c.id;
      await db.from('entreprises').update({ stripe_customer_id: client }).eq('user_id', user.id);
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});
    if ((body as { action?: string }).action === 'gerer') {
      const p = await stripe.billingPortal.sessions.create({ customer: client, return_url: `${site}/app/profil`, locale: 'fr' });
      return res.status(200).json({ url: p.url });
    }
    const s = await stripe.checkout.sessions.create({
      mode: 'subscription', customer: client, client_reference_id: user.id, locale: 'fr',
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      // essai de 14 jours offert seulement au premier abonnement
      subscription_data: { metadata: { user_id: user.id }, ...(ent.abonnement_statut ? {} : { trial_period_days: 14 }) },
      allow_promotion_codes: true, tax_id_collection: { enabled: true }, customer_update: { name: 'auto', address: 'auto' }, billing_address_collection: 'required',
      success_url: `${site}/app/profil?abonnement=ok`, cancel_url: `${site}/app/profil`,
    });
    return res.status(200).json({ url: s.url });
  } catch (e) {
    console.error('Stripe :', e instanceof Error ? e.message : e);
    return res.status(502).json({ erreur: 'Le service de paiement ne répond pas. Réessayez dans un instant.' });
  }
}
