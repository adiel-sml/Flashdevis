import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Avatar, EnTete, eurosRond, Statut } from '../components/Elements';
import { IcRecherche } from '../components/Icones';
import { useEtat } from '../lib/store';
import { actions, etape, ttc } from '../lib/suivi';
import type { Devis } from '../lib/types';

const FILTRES = [
  { cle: 'tous', lib: 'Tous', garde: () => true },
  { cle: 'relancer', lib: 'À relancer', garde: () => true },
  { cle: 'brouillons', lib: 'Brouillons', garde: (d: Devis) => etape(d) === 'brouillon' },
  { cle: 'signes', lib: 'Signés', garde: (d: Devis) => etape(d) === 'signe' },
  { cle: 'factures', lib: 'Factures', garde: (d: Devis) => etape(d) === 'facture' || etape(d) === 'payee' },
] as const;
const sansAccent = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function ListeDevis() {
  const { devis, entreprise } = useEtat();
  const [params, setParams] = useSearchParams();
  const filtre = FILTRES.find(f => f.cle === params.get('filtre')) ?? FILTRES[0];
  const [q, setQ] = useState('');
  const aRelancer = useMemo(() => new Set(actions(devis, entreprise.regimeTva).filter(a => a.type.startsWith('relancer')).map(a => a.devis.id)), [devis, entreprise.regimeTva]);
  const garde = (f: (typeof FILTRES)[number]) => (d: Devis) => (f.cle === 'relancer' ? aRelancer.has(d.id) : f.garde(d));

  const visibles = [...devis].sort((a, b) => b.dateCreation.localeCompare(a.dateCreation)).filter(garde(filtre)).filter(d => !q || sansAccent(`${d.titre} ${d.client.nom} ${d.numero} ${d.facture?.numero ?? ''}`).includes(sansAccent(q)));
  const parMois: [string, Devis[]][] = [];
  for (const d of visibles) {
    const m = new Date(d.dateCreation).toLocaleDateString('fr-FR', { month: 'long', year: new Date(d.dateCreation).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
    if (parMois.at(-1)?.[0] === m) parMois.at(-1)![1].push(d); else parMois.push([m, [d]]);
  }

  return (
    <div>
      <EnTete titre="Devis" />
      <label className="flex items-center gap-2.5 rounded-[14px] border border-trait bg-white px-3.5 py-2.5 text-gris focus-within:border-encre-900">
        <IcRecherche className="h-[18px] w-[18px]" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Client, chantier, numéro…" className="w-full bg-transparent text-sm text-encre-900 outline-none placeholder:text-gris" />
      </label>
      <div className="-mx-5 mb-1 mt-3 flex gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {FILTRES.map(f => { const n = devis.filter(garde(f)).length, on = f === filtre; return (
          <button key={f.cle} onClick={() => setParams(f.cle === 'tous' ? {} : { filtre: f.cle }, { replace: true })} className={`shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-semibold ${on ? 'border-encre-900 bg-encre-900 text-white' : 'border-trait bg-white'}`}>
            {f.lib}<span className={`ml-1 ${on ? 'text-[#9aa1ad]' : 'text-gris'}`}>{n}</span>
          </button>
        ); })}
      </div>
      {visibles.length === 0 && <p className="py-16 text-center text-sm text-gris">{devis.length ? 'Aucun devis ici.' : 'Vos devis apparaîtront ici. Touchez le micro pour commencer.'}</p>}
      {parMois.map(([mois, liste]) => (
        <section key={mois}>
          <h2 className="lab mb-1 mt-4 capitalize">{mois}</h2>
          <ul>{liste.map(d => (
            <li key={d.id}><Link to={`/app/devis/${d.id}`} className="flex items-center gap-3 border-b border-trait py-3 active:bg-white/60">
              <Avatar nom={d.client.nom || '?'} />
              <span className="min-w-0 flex-1"><b className="block truncate text-[14.5px] font-bold">{d.titre}</b><span className="block truncate text-[12.5px] text-gris">{d.client.nom || 'Client sans nom'} · {d.facture?.numero ?? d.numero}</span></span>
              <span className="shrink-0 text-right"><b className="block text-[14.5px] font-bold">{eurosRond(ttc(d, entreprise.regimeTva))}</b><Statut d={d} className="mt-0.5" /></span>
            </Link></li>
          ))}</ul>
        </section>
      ))}
    </div>
  );
}
