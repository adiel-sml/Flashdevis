import { Link, useNavigate, useParams } from 'react-router-dom';
import { acompte, euros, prochainNumero, totalLigne, totaux } from '../lib/calcul';
import { pdfDocument } from '../lib/pdf';
import { enregistrerDevis, getEtat, supprimerDevis, useEtat } from '../lib/store';
import type { Devis } from '../lib/types';
import { STATUTS } from './TableauDeBord';

export default function DetailDevis() {
  const { id } = useParams();
  const { devis, entreprise } = useEtat();
  const nav = useNavigate();
  const d = devis.find(x => x.id === id);
  if (!d) return <div className="carte">Ce devis n’existe pas. <Link to="/app" className="underline">Retour</Link></div>;
  const t = totaux(d.lignes, entreprise.regimeTva);
  const maj = (patch: Partial<Devis>) => enregistrerDevis({ ...d, ...patch });
  const lienSignature = `${location.origin}/s/${d.id}`;

  const telecharger = (mode: 'devis' | 'facture') => pdfDocument(d, entreprise, mode).save(`${mode === 'facture' ? d.facture!.numero : d.numero}.pdf`);
  async function envoyer() {
    const texte = `Bonjour ${d!.client.nom},\n\nVoici votre devis ${d!.numero} « ${d!.titre} » d’un montant de ${euros(t.ttc)}.\nVous pouvez le consulter et le signer en ligne : ${lienSignature}\n\nCordialement,\n${entreprise.nom}`;
    if (navigator.share) { try { await navigator.share({ title: `Devis ${d!.numero}`, text: texte }); } catch { return; } }
    else location.href = `mailto:${d!.client.email}?subject=${encodeURIComponent(`Devis ${d!.numero} · ${entreprise.nom}`)}&body=${encodeURIComponent(texte)}`;
    if (d!.statut === 'brouillon') maj({ statut: 'envoye' });
  }
  function facturer() {
    const numeros = getEtat().devis.flatMap(x => (x.facture ? [x.facture.numero] : []));
    maj({ statut: 'facture', facture: { numero: prochainNumero('F', new Date().getFullYear(), numeros), date: new Date().toISOString(), payee: false } });
  }
  function relancer() {
    const texte = `Bonjour ${d!.client.nom},\n\nSauf erreur de ma part, la facture ${d!.facture!.numero} de ${euros(t.ttc)} reste à régler. Pourriez-vous procéder au paiement dès que possible ?\n\nMerci d’avance,\n${entreprise.nom}`;
    location.href = `mailto:${d!.client.email}?subject=${encodeURIComponent(`Rappel : facture ${d!.facture!.numero}`)}&body=${encodeURIComponent(texte)}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{d.numero}{d.facture && ` · Facture ${d.facture.numero}`}</p>
          <h1 className="text-2xl font-extrabold">{d.titre}</h1>
          <p className="text-slate-600">{d.client.nom || 'Client sans nom'}{d.client.adresse && ` · ${d.client.adresse}`}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUTS[d.statut].style}`}>{d.facture?.payee ? 'Payé' : STATUTS[d.statut].libelle}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {!d.facture && <button onClick={envoyer} className="btn-primaire">Envoyer au client</button>}
        <button onClick={() => telecharger('devis')} className="btn-secondaire">PDF du devis</button>
        {!d.facture && <Link to={`/app/devis/${d.id}/modifier`} className="btn-secondaire">Modifier</Link>}
        {(d.statut === 'envoye' || d.statut === 'brouillon') && <button onClick={() => maj({ statut: 'signe' })} className="btn-secondaire">Marquer comme signé</button>}
        {d.statut === 'signe' && <button onClick={facturer} className="btn-primaire">Transformer en facture</button>}
        {d.facture && <button onClick={() => telecharger('facture')} className="btn-primaire">PDF de la facture</button>}
        {d.facture && !d.facture.payee && <button onClick={relancer} className="btn-secondaire">Relancer le client</button>}
        {d.facture && !d.facture.payee && <button onClick={() => maj({ facture: { ...d.facture!, payee: true } })} className="btn-secondaire">Marquer comme payée</button>}
      </div>
      {d.statut === 'envoye' && <p className="text-sm text-slate-500">Lien de signature à transmettre : <span className="break-all font-mono">{lienSignature}</span></p>}

      <section className="carte overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-slate-500"><th className="py-2">Désignation</th><th className="text-right">Qté</th><th className="text-right">PU HT</th><th className="text-right">Total HT</th></tr></thead>
          <tbody>{d.lignes.map(l => (
            <tr key={l.id} className="border-b border-slate-100"><td className="py-2 pr-2">{l.designation}</td><td className="text-right">{l.quantite} {l.unite}</td><td className="text-right">{euros(l.prixUnitaireHt)}</td><td className="text-right font-medium">{euros(totalLigne(l))}</td></tr>
          ))}</tbody>
        </table>
        <div className="ml-auto mt-4 w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><span>Total HT</span><span>{euros(t.ht)}</span></div>
          {t.tva.map(v => <div key={v.taux} className="flex justify-between text-slate-600"><span>TVA {String(v.taux).replace('.', ',')} %</span><span>{euros(v.montant)}</span></div>)}
          <div className="flex justify-between border-t pt-1 text-base font-extrabold"><span>{entreprise.regimeTva === 'franchise' ? 'Total' : 'Total TTC'}</span><span>{euros(t.ttc)}</span></div>
          {entreprise.acomptePct > 0 && !d.facture && <div className="flex justify-between text-slate-600"><span>Acompte {entreprise.acomptePct} %</span><span>{euros(acompte(t.ttc, entreprise.acomptePct))}</span></div>}
        </div>
      </section>
      {d.signature && <p className="text-sm text-green-700">Signé par {d.signature.nom} le {new Date(d.signature.date).toLocaleDateString('fr-FR')}.</p>}
      {!d.facture && <button onClick={() => { if (confirm('Supprimer ce devis ?')) { supprimerDevis(d.id); nav('/app'); } }} className="text-sm text-red-600 underline">Supprimer le devis</button>}
    </div>
  );
}
