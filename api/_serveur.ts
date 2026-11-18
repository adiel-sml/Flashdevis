// Outils partagés des fonctions serveur (fichier préfixé par _ : Vercel n'en fait pas une route)
import { createClient } from '@supabase/supabase-js';

export interface Req { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string }; [Symbol.asyncIterator]?: () => AsyncIterator<Buffer | string> }
export interface Res { status(code: number): Res; json(body: unknown): void; setHeader(name: string, value: string): void; end?(body?: string): void }

const url = () => process.env.VITE_SUPABASE_URL ?? '';

// Artisan connecté, d'après le jeton de session envoyé par l'appli
export async function utilisateur(req: Req) {
  const anon = process.env.VITE_SUPABASE_ANON_KEY, jeton = String(req.headers.authorization ?? '').replace(/^Bearer /, '');
  if (!url() || !anon || !jeton) return null;
  const { data } = await createClient(url(), anon, { auth: { persistSession: false } }).auth.getUser(jeton);
  return data.user;
}

// Accès administrateur à la base : uniquement côté serveur, jamais dans l'appli (clé service_role)
export function admin() {
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url() || !cle) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante');
  return createClient(url(), cle, { auth: { persistSession: false } });
}

// Adresse publique du site, pour les retours depuis Stripe
export const origine = (req: Req) => process.env.SITE_URL || `https://${String(req.headers['x-forwarded-host'] ?? req.headers.host)}`;

// Statut d'abonnement Stripe → offre dans FlashDevis (l'essai et un retard de paiement en cours de relance gardent l'offre Pro)
export const planDepuisStatut = (statut: string | null | undefined): 'pro' | 'gratuit' => (statut === 'trialing' || statut === 'active' || statut === 'past_due' ? 'pro' : 'gratuit');
