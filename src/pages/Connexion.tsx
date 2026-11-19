// Connexion sans mot de passe : l'artisan reçoit un lien par e-mail.
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Logo } from '../components/Cadre';
import { supabase } from '../lib/supabase';

export default function Connexion() {
  const [email, setEmail] = useState('');
  const [etat, setEtat] = useState<'saisie' | 'envoi' | 'envoye'>('saisie');
  const [erreur, setErreur] = useState('');
  if (!supabase) return <Navigate to="/app" replace />;

  async function envoyer(ev: React.FormEvent) {
    ev.preventDefault(); setEtat('envoi'); setErreur('');
    const { error } = await supabase!.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${location.origin}/app` } });
    if (error) { setErreur('Envoi impossible. Vérifiez l’adresse ou réessayez dans une minute.'); setEtat('saisie'); } else setEtat('envoye');
  }

  return (
    <div className="mx-auto max-w-md space-y-6 p-6">
      <Link to="/"><Logo /></Link>
      {etat === 'envoye' ? (
        <p className="carte bg-green-50 text-green-800">C’est envoyé. Ouvrez l’e-mail reçu à <b>{email}</b> et touchez le lien pour vous connecter.</p>
      ) : (
        <form onSubmit={envoyer} className="carte space-y-3">
          <h1 className="text-2xl font-extrabold">Connexion</h1>
          <p className="text-sm text-slate-600">Pas de mot de passe : entrez votre e-mail, vous recevez un lien de connexion. Le compte est créé à la première connexion.</p>
          <label><span className="etiquette">E-mail</span><input type="email" required autoComplete="email" className="champ" value={email} onChange={e => setEmail(e.target.value)} /></label>
          <button className="btn-primaire w-full" disabled={etat === 'envoi'}>{etat === 'envoi' ? 'Envoi…' : 'Recevoir mon lien'}</button>
          {erreur && <p role="alert" className="text-sm text-red-700">{erreur}</p>}
          <p className="text-xs text-gris">En continuant, vous acceptez les <Link to="/conditions" className="underline">conditions générales</Link> et la <Link to="/confidentialite" className="underline">politique de confidentialité</Link>.</p>
        </form>
      )}
    </div>
  );
}
