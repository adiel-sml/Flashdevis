// Suppression du compte (droit à l'effacement) : le serveur arrête l'abonnement Stripe puis efface le compte et toutes ses données
import { supabase, jetonAcces } from './supabase';

export async function supprimerCompte() {
  if (!supabase) { localStorage.removeItem('flashdevis:v1'); return; }   // mode démo : tout est dans le navigateur
  const jeton = await jetonAcces();
  const r = await fetch('/api/compte', { method: 'DELETE', headers: jeton ? { Authorization: `Bearer ${jeton}` } : {} });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.erreur || 'Suppression impossible. Réessayez.');
  await supabase.auth.signOut().catch(() => undefined);
}
