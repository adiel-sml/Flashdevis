import { Link, NavLink, Outlet } from 'react-router-dom';
import { useEtat } from '../lib/store';

export const Logo = ({ clair = false }: { clair?: boolean }) => (
  <span className={`inline-flex items-center gap-2 text-lg font-extrabold tracking-tight ${clair ? 'text-white' : 'text-encre-900'}`}>
    <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden><rect width="64" height="64" rx="14" fill="#111827" /><path d="M36 6 14 36h14l-4 22 22-30H32l4-22z" fill="#f5a800" /></svg>
    Flash<span className="text-flash-500">Devis</span>
  </span>
);

const lien = ({ isActive }: { isActive: boolean }) => `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'bg-flash-100 text-encre-900' : 'text-slate-600 hover:text-encre-900'}`;

export default function Cadre() {
  const { entreprise } = useEtat();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/app" aria-label="Tableau de bord"><Logo /></Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/app" end className={lien}>Devis</NavLink>
            <NavLink to="/app/parametres" className={lien}>Paramètres</NavLink>
            <Link to="/app/nouveau" className="btn-primaire ml-1 hidden sm:inline-flex">+ Nouveau devis</Link>
          </nav>
        </div>
      </header>
      {!entreprise.nom && (
        <div className="border-b border-flash-100 bg-flash-50">
          <p className="mx-auto max-w-5xl px-4 py-2 text-sm text-encre-800">Renseignez votre entreprise (nom, SIRET, TVA, assurance) pour des devis complets. <Link to="/app/parametres" className="font-semibold underline">Paramètres</Link></p>
        </div>
      )}
      <main className="mx-auto max-w-5xl px-4 py-6 pb-28"><Outlet /></main>
      <Link to="/app/nouveau" className="btn-primaire fixed bottom-5 right-5 rounded-full px-5 py-4 text-base shadow-lg sm:hidden">+ Devis</Link>
    </div>
  );
}
