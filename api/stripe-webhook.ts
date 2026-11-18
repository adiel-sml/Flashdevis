// Webhook Stripe : seule voie pour passer un compte en Pro ou le remettre en gratuit (l'appli ne peut pas modifier son offre).
// Événements à cocher dans Stripe : checkout.session.completed, customer.subscription.created, .updated, .deleted
import Stripe from 'stripe';
import { admin, planDepuisStatut, type Req, type Res } from './_serveur.js';

async function corpsBrut(req: Req) {
  const morceaux: Buffer[] = [];
  for await (const m of req as unknown as AsyncIterable<Buffer | string>) morceaux.push(typeof m === 'string' ? Buffer.from(m) : m);
  return Buffer.concat(morceaux);
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return res.status(405).json({ erreur: 'Méthode non autorisée' });
  const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = process.env;
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) return res.status(500).json({ erreur: 'Webhook non configuré' });
  const stripe = new Stripe(STRIPE_SECRET_KEY);

  // La signature prouve que l'appel vient bien de Stripe (sinon n'importe qui pourrait se passer Pro)
  let ev: Stripe.Event;
  try { ev = stripe.webhooks.constructEvent(await corpsBrut(req), String(req.headers['stripe-signature'] ?? ''), STRIPE_WEBHOOK_SECRET); }
  catch { return res.status(400).json({ erreur: 'Signature invalide' }); }

  let abo: Stripe.Subscription | null = null;
  if (ev.type === 'checkout.session.completed') {
    const s = ev.data.object as Stripe.Checkout.Session;
    if (s.mode === 'subscription' && s.subscription) abo = await stripe.subscriptions.retrieve(String(s.subscription));
  } else if (ev.type.startsWith('customer.subscription.')) abo = ev.data.object as Stripe.Subscription;
  if (!abo) return res.status(200).json({ recu: true });

  // Fin de période : sur l'abonnement (anciennes versions de l'API) ou sur sa première ligne (versions récentes)
  const fin = (abo as unknown as { current_period_end?: number }).current_period_end ?? abo.items.data[0]?.current_period_end;
  const maj = { plan: planDepuisStatut(abo.status), abonnement_statut: abo.status, abonnement_fin: fin ? new Date(fin * 1000).toISOString() : null, stripe_customer_id: String(abo.customer) };
  const db = admin(), userId = abo.metadata?.user_id;
  const { error, count } = userId
    ? await db.from('entreprises').update(maj, { count: 'exact' }).eq('user_id', userId)
    : await db.from('entreprises').update(maj, { count: 'exact' }).eq('stripe_customer_id', String(abo.customer));
  if (error) { console.error('Webhook Stripe, base :', error.message); return res.status(500).json({ erreur: 'Mise à jour impossible' }); }   // Stripe réessaiera
  if (!count) console.warn('Webhook Stripe : aucun compte pour', abo.customer);
  return res.status(200).json({ recu: true });
}
