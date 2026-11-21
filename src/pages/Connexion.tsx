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
    <div className="min-h-screen bg-papier">
      <div className="mx-auto max-w-md px-5 pt-6">
        <Link to="/"><Logo /></Link>
        {etat === 'envoye' ? (
          <div className="mt-10">
            <h1 className="titre-page">Regardez vos e-mails</h1>
            <p className="mt-2 text-encre-600">Un lien de connexion vient de partir vers <b>{email}</b>. Touchez-le pour entrer.</p>
            <button onClick={() => setEtat('saisie')} className="btn-secondaire mt-6 w-full">Changer d’adresse</button>
          </div>
        ) : (
          <form onSubmit={envoyer} className="mt-10 space-y-4">
            <h1 className="titre-page">Connexion</h1>
            <p className="text-encre-600">Pas de mot de passe : vous recevez un lien par e-mail.</p>
            <input type="email" required autoComplete="email" inputMode="email" placeholder="votre@email.fr" aria-label="E-mail" className="champ" value={email} onChange={e => setEmail(e.target.value)} />
            <button className="btn-primaire btn-grand w-full" disabled={etat === 'envoi'}>{etat === 'envoi' ? 'Envoi…' : 'Recevoir mon lien'}</button>
            {erreur && <p role="alert" className="text-sm text-alerte">{erreur}</p>}
            <p className="text-xs text-gris">En continuant, vous acceptez les <Link to="/conditions" className="underline">conditions générales</Link> et la <Link to="/confidentialite" className="underline">politique de confidentialité</Link>.</p>
          </form>
        )}
      </div>
    </div>
  );
}
