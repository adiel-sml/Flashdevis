import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { euros, prochainNumero, totalLigne, totaux } from '../lib/calcul';
import { useDictee } from '../lib/dictee';
import { apprendreTarifs, enregistrerDevis, getEtat, id, useEtat } from '../lib/store';
import type { Client, Devis, Ligne } from '../lib/types';

const ligneVide = (tva: number): Ligne => ({ id: id(), designation: '', quantite: 1, unite: 'u', prixUnitaireHt: 0, tauxTva: tva, estimation: false });
const TAUX = [20, 10, 5.5, 0];
const nombre = (v: string) => { const n = Number(v.replace(',', '.')); return Number.isFinite(n) ? n : 0; };

export default function EditeurDevis() {
  const { id: idDevis } = useParams();
  const { entreprise, tarifs } = useEtat();
  const existant = idDevis ? getEtat().devis.find(d => d.id === idDevis) : undefined;
  const nav = useNavigate();
  const tvaDefaut = entreprise.regimeTva === 'franchise' ? 0 : 20;

  const [description, setDescription] = useState('');
  const [titre, setTitre] = useState(existant?.titre ?? '');
  const [client, setClient] = useState<Client>(existant?.client ?? { nom: '', adresse: '', email: '', telephone: '' });
  const [lignes, setLignes] = useState<Ligne[]>(existant?.lignes ?? []);
  const [remarques, setRemarques] = useState(existant?.remarques ?? '');
  const [conseils, setConseils] = useState<string[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const dictee = useDictee(t => setDescription(d => (d ? `${d} ${t}` : t)));
  const t = useMemo(() => totaux(lignes, entreprise.regimeTva), [lignes, entreprise.regimeTva]);

  async function generer() {
    setChargement(true); setErreur(''); dictee.arreter();
    try {
      const r = await fetch('/api/generer-devis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texte: description, metier: entreprise.metier, regimeTva: entreprise.regimeTva, tarifs: tarifs.slice(-80).map(({ designation, unite, prixHt }) => ({ designation, unite, prixHt })) }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.erreur || 'La génération a échoué.');
      setTitre(x => x || data.titre);
      setLignes(x => [...x, ...data.lignes.map((l: { designation: string; quantite: number; unite: string; prix_unitaire_ht: number; taux_tva: number; estimation: boolean }) => ({ id: id(), designation: l.designation, quantite: l.quantite, unite: l.unite, prixUnitaireHt: l.prix_unitaire_ht, tauxTva: l.taux_tva, estimation: l.estimation }))]);
      setConseils(data.remarques ?? []);
    } catch (e) { setErreur(e instanceof Error ? e.message : 'La génération a échoué.'); }
    finally { setChargement(false); }
  }

  const maj = (i: number, patch: Partial<Ligne>) => setLignes(ls => ls.map((l, j) => (j === i ? { ...l, ...patch, estimation: 'prixUnitaireHt' in patch ? false : l.estimation } : l)));

  function enregistrer() {
    const tous = getEtat().devis;
    const d: Devis = {
      id: existant?.id ?? id(),
      numero: existant?.numero ?? prochainNumero('D', new Date().getFullYear(), tous.map(x => x.numero)),
      titre: titre || 'Devis', client, lignes: lignes.filter(l => l.designation.trim()), remarques,
      dateCreation: existant?.dateCreation ?? new Date().toISOString(), statut: existant?.statut ?? 'brouillon', signature: existant?.signature, facture: existant?.facture,
    };
    enregistrerDevis(d);
    apprendreTarifs(d.lignes.filter(l => !l.estimation));
    nav(`/app/devis/${d.id}`);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">{existant ? `Modifier le devis ${existant.numero}` : 'Nouveau devis'}</h1>

      <section className="carte">
        <h2 className="mb-1 text-lg font-bold">Décrivez le chantier</h2>
        <p className="mb-3 text-sm text-slate-600">Parlez comme à un collègue : surfaces, matériaux, fournitures, dépose… FlashDevis rédige les lignes avec vos tarifs.</p>
        <div className="relative">
          <textarea className="champ min-h-32" value={dictee.provisoire ? `${description} ${dictee.provisoire}` : description} onChange={e => setDescription(e.target.value)} maxLength={2000}
            placeholder="Ex. : salle de bain de 6 m², dépose de l’ancien carrelage, pose de faïence murale 15 m², fourniture comprise, remplacement du lavabo et du mitigeur." />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={dictee.ecoute ? dictee.arreter : dictee.demarrer} className={dictee.ecoute ? 'btn bg-red-600 text-white hover:bg-red-500' : 'btn-secondaire'} aria-pressed={dictee.ecoute}>
            <span className={`h-2.5 w-2.5 rounded-full ${dictee.ecoute ? 'animate-pulse bg-white' : 'bg-red-500'}`} />{dictee.ecoute ? 'Arrêter la dictée' : 'Dicter'}
          </button>
          <button type="button" onClick={generer} disabled={chargement || description.trim().length < 5} className="btn-primaire">
            {chargement ? 'Rédaction en cours…' : '⚡ Générer les lignes'}
          </button>
          <span className="text-xs text-slate-500">{description.length}/2000</span>
        </div>
        {(erreur || dictee.erreur) && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erreur || dictee.erreur}</p>}
        {conseils.length > 0 && (
          <ul className="mt-3 space-y-1 rounded-lg bg-flash-50 px-4 py-3 text-sm text-encre-800">
            <li className="font-semibold">À vérifier :</li>{conseils.map((c, i) => <li key={i}>• {c}</li>)}
          </ul>
        )}
      </section>

      <section className="carte space-y-3">
        <h2 className="text-lg font-bold">Client</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label><span className="etiquette">Nom</span><input className="champ" value={client.nom} onChange={e => setClient({ ...client, nom: e.target.value })} /></label>
          <label><span className="etiquette">Téléphone</span><input className="champ" value={client.telephone} onChange={e => setClient({ ...client, telephone: e.target.value })} /></label>
          <label className="sm:col-span-2"><span className="etiquette">Adresse du chantier</span><input className="champ" value={client.adresse} onChange={e => setClient({ ...client, adresse: e.target.value })} /></label>
          <label className="sm:col-span-2"><span className="etiquette">E-mail</span><input type="email" className="champ" value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} /></label>
        </div>
      </section>

      <section className="carte space-y-3">
        <label><span className="etiquette">Objet du devis</span><input className="champ" value={titre} onChange={e => setTitre(e.target.value)} placeholder="Rénovation de la salle de bain" /></label>
        <div className="space-y-3">
          {lignes.map((l, i) => (
            <div key={l.id} className={`rounded-xl border p-3 ${l.estimation ? 'border-flash-400 bg-flash-50' : 'border-slate-200'}`}>
              <div className="flex gap-2">
                <input className="champ" aria-label="Désignation" value={l.designation} onChange={e => maj(i, { designation: e.target.value })} placeholder="Désignation" />
                <button type="button" onClick={() => setLignes(ls => ls.filter((_, j) => j !== i))} className="btn-secondaire px-3" aria-label="Supprimer la ligne">✕</button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <label><span className="etiquette">Qté</span><input inputMode="decimal" className="champ" value={l.quantite} onChange={e => maj(i, { quantite: nombre(e.target.value) })} /></label>
                <label><span className="etiquette">Unité</span><input className="champ" value={l.unite} onChange={e => maj(i, { unite: e.target.value })} /></label>
                <label><span className="etiquette">PU HT (€)</span><input inputMode="decimal" className="champ" value={l.prixUnitaireHt} onChange={e => maj(i, { prixUnitaireHt: nombre(e.target.value) })} /></label>
                {entreprise.regimeTva === 'normal' && (
                  <label><span className="etiquette">TVA</span><select className="champ" value={l.tauxTva} onChange={e => maj(i, { tauxTva: Number(e.target.value) })}>{TAUX.map(x => <option key={x} value={x}>{String(x).replace('.', ',')} %</option>)}</select></label>
                )}
                <div className="flex items-end justify-end font-semibold">{euros(totalLigne(l))}</div>
              </div>
              {l.estimation && <p className="mt-2 text-xs font-medium text-flash-600">Prix estimé : vérifiez-le, il sera mémorisé une fois modifié.</p>}
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setLignes(ls => [...ls, ligneVide(tvaDefaut)])} className="btn-secondaire">+ Ajouter une ligne</button>
        <label className="block"><span className="etiquette">Remarques pour le client (facultatif)</span><textarea className="champ" value={remarques} onChange={e => setRemarques(e.target.value)} /></label>
      </section>

      <section className="carte sticky bottom-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-600">Total HT <b className="text-encre-900">{euros(t.ht)}</b>{entreprise.regimeTva === 'normal' && <> · TTC <b className="text-encre-900">{euros(t.ttc)}</b></>}</div>
        <button type="button" onClick={enregistrer} disabled={!lignes.some(l => l.designation.trim())} className="btn-primaire">Enregistrer le devis</button>
      </section>
    </div>
  );
}
