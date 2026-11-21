// Champs qui préremplissent : adresse proposée pendant la frappe, entreprise retrouvée dans le registre officiel
import { useEffect, useRef, useState } from 'react';
import { chercherAdresse, chercherEntreprise, type EntrepriseTrouvee } from '../lib/registre';
import { IcRecherche } from './Icones';

function useSuggestions<T>(q: string, chercher: (q: string, s: AbortSignal) => Promise<T[]>, actif: boolean) {
  const [liste, setListe] = useState<T[]>([]);
  useEffect(() => {
    if (!actif) { setListe([]); return; }
    const c = new AbortController();
    const t = setTimeout(() => chercher(q, c.signal).then(setListe, () => setListe([])), 250);
    return () => { clearTimeout(t); c.abort(); };
  }, [q, chercher, actif]);
  return liste;
}

export function ChampAdresse({ valeur, changer, placeholder = 'Adresse', id }: { valeur: string; changer: (v: string) => void; placeholder?: string; id?: string }) {
  const [ouvert, setOuvert] = useState(false);
  const liste = useSuggestions(valeur, chercherAdresse, ouvert);
  return (
    <div className="relative">
      <input id={id} className="champ" value={valeur} placeholder={placeholder} autoComplete="street-address" onChange={e => { changer(e.target.value); setOuvert(true); }} onBlur={() => setTimeout(() => setOuvert(false), 150)} />
      {ouvert && liste.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-trait bg-white shadow-lg">
          {liste.map(a => <li key={a}><button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { changer(a); setOuvert(false); }} className="min-h-11 w-full px-3.5 py-2.5 text-left text-sm hover:bg-papier">{a}</button></li>)}
        </ul>
      )}
    </div>
  );
}

export function RechercheEntreprise({ choisir }: { choisir: (e: EntrepriseTrouvee) => void }) {
  const [q, setQ] = useState('');
  const [ouvert, setOuvert] = useState(false);
  const liste = useSuggestions(q, chercherEntreprise, ouvert);
  const champ = useRef<HTMLInputElement>(null);
  return (
    <div className="relative">
      <label className="flex min-h-12 items-center gap-2.5 rounded-xl border border-encre-900 bg-white px-3.5 focus-within:ring-2 focus-within:ring-flash-100">
        <IcRecherche className="h-5 w-5 shrink-0 text-gris" />
        <input ref={champ} value={q} onChange={e => { setQ(e.target.value); setOuvert(true); }} onBlur={() => setTimeout(() => setOuvert(false), 150)} placeholder="Nom de l’entreprise ou SIREN" className="w-full bg-transparent text-[15px] outline-none placeholder:text-gris" />
      </label>
      {ouvert && liste.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-trait bg-white shadow-lg">
          {liste.map(e => (
            <li key={e.siret || e.siren}><button type="button" onMouseDown={ev => ev.preventDefault()} onClick={() => { choisir(e); setQ(''); setOuvert(false); }} className="w-full px-3.5 py-2.5 text-left hover:bg-papier">
              <b className="block text-sm">{e.nom}</b><span className="block truncate text-xs text-gris">{e.adresse || `SIREN ${e.siren}`}</span>
            </button></li>
          ))}
        </ul>
      )}
    </div>
  );
}
