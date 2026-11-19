import type { ReactNode } from 'react';
import { initiales, statutAffiche, type Ton } from '../lib/suivi';
import type { Devis } from '../lib/types';

export const COULEUR: Record<Ton, string> = { rouge: 'text-alerte', bleu: 'text-info', vert: 'text-ok', jaune: 'text-flash-700', neutre: 'text-gris' };
const POINT: Record<Ton, string> = { rouge: 'bg-alerte', bleu: 'bg-info', vert: 'bg-ok', jaune: 'bg-flash-500', neutre: 'bg-gris/60' };

export const Statut = ({ d, className = '' }: { d: Devis; className?: string }) => {
  const s = statutAffiche(d);
  return <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${COULEUR[s.ton]} ${className}`}><i className={`h-[7px] w-[7px] rounded-full ${POINT[s.ton]}`} />{s.libelle}</span>;
};

export const Avatar = ({ nom, taille = 'h-10 w-10 text-sm', sombre = false, src }: { nom: string; taille?: string; sombre?: boolean; src?: string | null }) => src
  ? <img src={src} alt="" className={`shrink-0 rounded-xl border border-trait bg-white object-contain p-1 ${taille}`} />
  : <span className={`grid shrink-0 place-items-center rounded-xl font-bold ${taille} ${sombre ? 'bg-encre-900 text-flash-500' : 'bg-creme text-encre-600'}`}>{initiales(nom)}</span>;

export const eurosRond = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export const EnTete = ({ titre, droite }: { titre: string; droite?: ReactNode }) => (
  <div className="mb-4 mt-2 flex items-center justify-between gap-3"><h1 className="titre-page">{titre}</h1>{droite}</div>
);

// Feuille qui monte du bas (menu « … », choix d'un client)
export const Feuille = ({ ouverte, fermer, children }: { ouverte: boolean; fermer: () => void; children: ReactNode }) => !ouverte ? null : (
  <div className="fixed inset-0 z-40 flex items-end justify-center bg-encre-900/40" onClick={fermer}>
    <div role="dialog" aria-modal className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" onClick={e => e.stopPropagation()}>
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-trait" />{children}
    </div>
  </div>
);
