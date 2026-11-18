import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { charger, useEtat, vider } from '../lib/store';
import { supabase } from '../lib/supabase';
import { IcAccueil, IcClients, IcDevis, IcMicro, IcProfil } from './Icones';

export const Logo = ({ clair = false }: { clair?: boolean }) => (
  <span className={`inline-flex items-center gap-2 text-lg font-extrabold tracking-tight ${clair ? 'text-white' : 'text-encre-900'}`}>
    <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden><rect width="64" height="64" rx="14" fill="#111827" /><path d="M36 6 14 36h14l-4 22 22-30H32l4-22z" fill="#f5a800" /></svg>
    Flash<span className="text-flash-500">Devis</span>
  </span>
);

const ONGLETS = [
  { to: '/app', fin: true, lib: 'Accueil', Ic: IcAccueil }, { to: '/app/devis', fin: false, lib: 'Devis', Ic: IcDevis },
  null,
  { to: '/app/clients', fin: false, lib: 'Clients', Ic: IcClients }, { to: '/app/profil', fin: false, lib: 'Profil', Ic: IcProfil },
];

function Navigation() {
  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-30 border-t border-trait bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid h-[72px] max-w-lg grid-cols-[1fr_1fr_84px_1fr_1fr] items-start pt-2.5">
        {ONGLETS.map(o => o ? (
          <NavLink key={o.to} to={o.to} end={o.fin} className={({ isActive }) => `flex flex-col items-center gap-1 text-[11px] font-semibold ${isActive ? 'text-encre-900' : 'text-gris'}`}>
            <o.Ic />{o.lib}
          </NavLink>
        ) : (
          <Link key="micro" to="/app/nouveau" aria-label="Nouveau devis" className="mx-auto -mt-7 grid h-[62px] w-[62px] place-items-center rounded-[20px] bg-encre-900 text-flash-500 shadow-[0_6px_16px_rgba(17,24,39,.3)] active:scale-95">
            <IcMicro className="h-7 w-7" />
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default function Cadre() {
  const { pret } = useEtat();
  const { pathname } = useLocation();
  // Avec Supabase, l'appli demande une session ; en mode démo, accès direct
  const [session, setSession] = useState<'attente' | 'absente' | 'ok'>(supabase ? 'attente' : 'ok');
  const [erreur, setErreur] = useState('');
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session ? 'ok' : 'absente'));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ? 'ok' : 'absente'));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!supabase) return;
    if (session === 'ok') charger().catch(() => setErreur('Impossible de charger vos données. Vérifiez votre connexion et rechargez la page.'));
    if (session === 'absente') vider();
  }, [session]);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  if (session === 'absente') return <Navigate to="/connexion" replace />;
  if (erreur) return <p role="alert" className="mx-auto mt-10 max-w-md carte text-alerte">{erreur}</p>;
  if (session === 'attente' || !pret) return <div className="grid min-h-screen place-items-center"><span className="h-8 w-8 animate-spin rounded-full border-[3px] border-trait border-t-encre-900" aria-label="Chargement" /></div>;
  // Création et fiche d'un devis : plein écran, avec leurs propres actions en bas
  const pleinEcran = /^\/app\/(nouveau|devis\/[^/]+)/.test(pathname);
  return (
    <div className="min-h-screen">
      <main className={`mx-auto max-w-lg px-5 pt-[max(1rem,env(safe-area-inset-top))] ${pleinEcran ? 'pb-36' : 'pb-32'}`}><Outlet /></main>
      {!pleinEcran && <Navigation />}
    </div>
  );
}
