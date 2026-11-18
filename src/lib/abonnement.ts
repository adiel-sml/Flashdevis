// Offre Pro : redirige vers la page de paiement Stripe ou vers l'espace de gestion de l'abonnement
import { charger, getEtat } from './store';
import { jetonAcces } from './supabase';

export async function allerVersStripe(action: 'essai' | 'gerer') {
  const jeton = await jetonAcces();
  const r = await fetch('/api/abonnement', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) }, body: JSON.stringify({ action }) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.url) throw new Error(data.erreur || 'Le paiement est indisponible pour le moment.');
  location.href = data.url;
}

// Au retour du paiement, Stripe prévient la base en quelques secondes : on recharge jusqu'à voir l'offre Pro
export async function attendrePro(essais = 8, pause = 1500) {
  for (let i = 0; i < essais; i++) {
    await charger();
    if (getEtat().plan === 'pro') return true;
    await new Promise(r => setTimeout(r, pause));
  }
  return false;
}
