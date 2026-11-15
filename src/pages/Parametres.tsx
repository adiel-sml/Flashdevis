import { useState } from 'react';
import { enregistrerEntreprise, enregistrerTarifs, id, useEtat } from '../lib/store';
import type { Entreprise, Tarif } from '../lib/types';

export default function Parametres() {
  const etat = useEtat();
  const [e, setE] = useState<Entreprise>(etat.entreprise);
  const [tarifs, setTarifs] = useState<Tarif[]>(etat.tarifs);
  const [ok, setOk] = useState(false);
  const champ = (k: keyof Entreprise, lib: string, props: Record<string, unknown> = {}) => (
    <label><span className="etiquette">{lib}</span><input className="champ" value={String(e[k])} onChange={ev => setE({ ...e, [k]: typeof e[k] === 'number' ? Number(ev.target.value) || 0 : ev.target.value })} {...props} /></label>
  );
  function enregistrer() { enregistrerEntreprise(e); enregistrerTarifs(tarifs.filter(t => t.designation.trim())); setOk(true); setTimeout(() => setOk(false), 2500); }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Paramètres</h1>
      <section className="carte space-y-3">
        <h2 className="text-lg font-bold">Mon entreprise</h2>
        <p className="text-sm text-slate-600">Ces informations apparaissent sur vos devis et factures. Elles sont obligatoires pour un document conforme.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {champ('nom', 'Nom ou raison sociale')}
          {champ('metier', 'Métier', { placeholder: 'Plombier chauffagiste' })}
          {champ('siret', 'SIRET', { inputMode: 'numeric' })}
          {champ('telephone', 'Téléphone')}
          <div className="sm:col-span-2">{champ('adresse', 'Adresse')}</div>
          {champ('email', 'E-mail')}
          <label><span className="etiquette">Régime de TVA</span>
            <select className="champ" value={e.regimeTva} onChange={ev => setE({ ...e, regimeTva: ev.target.value as Entreprise['regimeTva'] })}>
              <option value="normal">Assujetti à la TVA</option><option value="franchise">Franchise en base (micro-entreprise)</option>
            </select>
          </label>
          {e.regimeTva === 'normal' && champ('numeroTva', 'N° de TVA intracommunautaire')}
          <div className="sm:col-span-2">{champ('assurance', 'Assurance décennale ou RC pro', { placeholder: 'Assureur, n° de contrat, zone couverte' })}</div>
          {champ('validiteJours', 'Validité des devis (jours)', { inputMode: 'numeric' })}
          {champ('acomptePct', 'Acompte demandé (%)', { inputMode: 'numeric' })}
          <div className="sm:col-span-2">{champ('conditionsPaiement', 'Conditions de paiement')}</div>
        </div>
      </section>

      <section className="carte space-y-3">
        <h2 className="text-lg font-bold">Mes tarifs</h2>
        <p className="text-sm text-slate-600">FlashDevis reprend ces prix dans vos devis. Ils s’enrichissent aussi tout seuls quand vous enregistrez un devis.</p>
        {tarifs.length === 0 && <p className="text-sm text-slate-500">Aucun tarif pour l’instant.</p>}
        {tarifs.map((t, i) => (
          <div key={t.id} className="grid grid-cols-[1fr_5rem_6rem_auto] gap-2">
            <input className="champ" aria-label="Désignation" value={t.designation} onChange={ev => setTarifs(ts => ts.map((x, j) => (j === i ? { ...x, designation: ev.target.value } : x)))} />
            <input className="champ" aria-label="Unité" value={t.unite} onChange={ev => setTarifs(ts => ts.map((x, j) => (j === i ? { ...x, unite: ev.target.value } : x)))} />
            <input className="champ" aria-label="Prix HT" inputMode="decimal" value={t.prixHt} onChange={ev => setTarifs(ts => ts.map((x, j) => (j === i ? { ...x, prixHt: Number(ev.target.value.replace(',', '.')) || 0 } : x)))} />
            <button className="btn-secondaire px-3" aria-label="Supprimer le tarif" onClick={() => setTarifs(ts => ts.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button className="btn-secondaire" onClick={() => setTarifs(ts => [...ts, { id: id(), designation: '', unite: 'u', prixHt: 0 }])}>+ Ajouter un tarif</button>
      </section>
      <div className="flex items-center gap-3"><button onClick={enregistrer} className="btn-primaire">Enregistrer</button>{ok && <span className="text-sm font-medium text-green-700">Enregistré.</span>}</div>
    </div>
  );
}
