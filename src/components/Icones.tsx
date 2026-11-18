// Icônes au trait, dessinées pour l'appli (pas de bibliothèque à charger)
import type { ReactNode } from 'react';

const Ic = ({ children, className = 'h-6 w-6', epais = 2 }: { children: ReactNode; className?: string; epais?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={epais} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>{children}</svg>
);
type P = { className?: string };
export const IcAccueil = (p: P) => <Ic {...p}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></Ic>;
export const IcDevis = (p: P) => <Ic {...p}><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></Ic>;
export const IcClients = (p: P) => <Ic {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" /></Ic>;
export const IcProfil = (p: P) => <Ic {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Ic>;
export const IcMicro = (p: P) => <Ic epais={2.2} {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></Ic>;
export const IcHorloge = (p: P) => <Ic {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Ic>;
export const IcEnvoi = (p: P) => <Ic {...p}><path d="M4 12l16-8-6 16-3-7-7-1z" /></Ic>;
export const IcCoche = (p: P) => <Ic {...p}><path d="M5 13l4 4L19 7" /></Ic>;
export const IcCrayon = (p: P) => <Ic {...p}><path d="M4 20h4L19 9l-4-4L4 16z" /></Ic>;
export const IcRecherche = (p: P) => <Ic {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Ic>;
export const IcFermer = (p: P) => <Ic epais={2.2} {...p}><path d="M6 6l12 12M18 6L6 18" /></Ic>;
export const IcRetour = (p: P) => <Ic epais={2.2} {...p}><path d="M15 18l-6-6 6-6" /></Ic>;
export const IcSuite = (p: P) => <Ic {...p}><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></Ic>;
export const IcChevron = (p: P) => <Ic {...p}><path d="M9 6l6 6-6 6" /></Ic>;
export const IcTel = (p: P) => <Ic {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></Ic>;
export const IcMail = (p: P) => <Ic {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></Ic>;
export const IcBatiment = (p: P) => <Ic {...p}><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" /></Ic>;
export const IcListe = (p: P) => <Ic {...p}><path d="M4 7h16M4 12h16M4 17h10" /></Ic>;
export const IcBouclier = (p: P) => <Ic {...p}><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /></Ic>;
export const IcCarte = (p: P) => <Ic {...p}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></Ic>;
export const IcClavier = (p: P) => <Ic {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></Ic>;
export const IcPlus = (p: P) => <Ic {...p}><path d="M12 5v14M5 12h14" /></Ic>;
export const IcPdf = (p: P) => <Ic {...p}><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M12 11v6M9.5 14.5 12 17l2.5-2.5" /></Ic>;
export const IcEuro = (p: P) => <Ic {...p}><path d="M18 7a7 7 0 1 0 0 10M4 10h10M4 14h10" /></Ic>;
export const IcCorbeille = (p: P) => <Ic {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></Ic>;
export const IcLien = (p: P) => <Ic {...p}><path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1" /></Ic>;
