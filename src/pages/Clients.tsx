import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Avatar, EnTete, eurosRond, Statut } from '../components/Elements';
import { IcMail, IcMicro, IcRecherche, IcRetour, IcTel } from '../components/Icones';
import { useEtat } from '../lib/store';
import { clients, ttc } from '../lib/suivi';

export function ListeClients() {
  const { devis, entreprise } = useEtat();
  const [q, setQ] = useState('');
  const liste = clients(devis, entreprise.regimeTva).filter(c => !q || c.cle.includes(q.toLowerCase().trim()));
  return (
    <div>
      <EnTete titre="Clients" />
      {devis.length > 0 && (
        <label className="mb-2 flex items-center gap-2.5 rounded-[14px] border border-trait bg-white px-3.5 py-2.5 text-gris focus-within:border-encre-900">
          <IcRecherche className="h-[18px] w-[18px]" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Nom du client" className="w-full bg-transparent text-sm text-encre-900 outline-none placeholder:text-gris" />
        </label>
      )}
      {liste.length === 0 && <p className="py-16 text-center text-sm text-gris">{q ? 'Aucun client à ce nom.' : 'Vos clients apparaissent ici dès votre premier devis.'}</p>}
      <ul>{liste.map(c => (
        <li key={c.cle}><Link to={`/app/clients/${encodeURIComponent(c.cle)}`} className="flex items-center gap-3 border-b border-trait py-3">
          <Avatar nom={c.nom} />
          <span className="min-w-0 flex-1"><b className="block truncate text-[14.5px] font-bold">{c.nom}</b><span className="block truncate text-[12.5px] text-gris">{c.devis.length} devis · dernier le {new Date(c.dernier).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span></span>
          <span className="shrink-0 text-right">{c.du > 0 ? <><b className="block text-[14.5px] font-bold text-alerte">{eurosRond(c.du)}</b><span className="text-xs font-semibold text-alerte">à encaisser</span></> : c.total > 0 ? <><b className="block text-[14.5px] font-bold">{eurosRond(c.total)}</b><span className="text-xs text-gris">facturés</span></> : <span className="text-xs text-gris">en cours</span>}</span>
        </Link></li>
      ))}</ul>
    </div>
  );
}

export function FicheClient() {
  const { cle = '' } = useParams();
  const { devis, entreprise } = useEtat();
  const c = clients(devis, entreprise.regimeTva).find(x => x.cle === cle);
  if (!c) return <div className="mt-10 text-center text-gris">Client introuvable. <Link to="/app/clients" className="underline">Retour</Link></div>;
  return (
    <div>
      <Link to="/app/clients" className="mb-4 mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-gris"><IcRetour className="h-5 w-5" />Clients</Link>
      <div className="flex items-center gap-3.5"><Avatar nom={c.nom} taille="h-14 w-14 text-lg" sombre /><div className="min-w-0"><h1 className="truncate text-2xl font-extrabold tracking-tight">{c.nom}</h1>{c.adresse && <p className="truncate text-sm text-encre-600">{c.adresse}</p>}</div></div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <a href={c.telephone ? `tel:${c.telephone.replace(/\s/g, '')}` : undefined} aria-disabled={!c.telephone} className={`carte flex flex-col items-center gap-1 !p-3 text-[13px] font-semibold ${c.telephone ? '' : 'opacity-40'}`}><IcTel className="h-5 w-5" />Appeler</a>
        <a href={c.email ? `mailto:${c.email}` : undefined} aria-disabled={!c.email} className={`carte flex flex-col items-center gap-1 !p-3 text-[13px] font-semibold ${c.email ? '' : 'opacity-40'}`}><IcMail className="h-5 w-5" />E-mail</a>
        <Link to={`/app/nouveau?client=${encodeURIComponent(c.cle)}`} className="flex flex-col items-center gap-1 rounded-2xl bg-encre-900 p-3 text-[13px] font-semibold text-flash-500"><IcMicro className="h-5 w-5" />Devis</Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="carte !p-3.5"><p className="lab">Facturé</p><p className="mt-1 text-xl font-extrabold">{eurosRond(c.total)}</p></div>
        <div className="carte !p-3.5"><p className="lab">À encaisser</p><p className={`mt-1 text-xl font-extrabold ${c.du ? 'text-alerte' : ''}`}>{eurosRond(c.du)}</p></div>
      </div>
      <h2 className="lab mb-1 mt-6">Historique</h2>
      <ul>{c.devis.map(d => (
        <li key={d.id}><Link to={`/app/devis/${d.id}`} className="flex items-center gap-3 border-b border-trait py-3">
          <span className="min-w-0 flex-1"><b className="block truncate text-[14.5px] font-bold">{d.titre}</b><span className="text-[12.5px] text-gris">{d.facture?.numero ?? d.numero} · {new Date(d.dateCreation).toLocaleDateString('fr-FR')}</span></span>
          <span className="text-right"><b className="block text-[14.5px] font-bold">{eurosRond(ttc(d, entreprise.regimeTva))}</b><Statut d={d} /></span>
        </Link></li>
      ))}</ul>
    </div>
  );
}
