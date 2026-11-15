import { Link } from 'react-router-dom';
import { euros, totaux } from '../lib/calcul';
import { useEtat } from '../lib/store';
import type { StatutDevis } from '../lib/types';

export const STATUTS: Record<StatutDevis, { libelle: string; style: string }> = {
  brouillon: { libelle: 'Brouillon', style: 'bg-slate-100 text-slate-700' },
  envoye: { libelle: 'Envoyé', style: 'bg-blue-100 text-blue-800' },
  signe: { libelle: 'Signé', style: 'bg-green-100 text-green-800' },
  refuse: { libelle: 'Refusé', style: 'bg-red-100 text-red-700' },
  facture: { libelle: 'Facturé', style: 'bg-flash-100 text-encre-900' },
};

export default function TableauDeBord() {
  const { devis, entreprise } = useEtat();
  const ttc = (i: number) => totaux(devis[i].lignes, entreprise.regimeTva).ttc;
  const enAttente = devis.reduce((s, d, i) => s + (d.statut === 'envoye' ? ttc(i) : 0), 0);
  const signes = devis.reduce((s, d, i) => s + (d.statut === 'signe' || d.statut === 'facture' ? ttc(i) : 0), 0);
  const impayes = devis.reduce((s, d, i) => s + (d.facture && !d.facture.payee ? ttc(i) : 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {[['Devis en attente', enAttente], ['Devis signés', signes], ['Factures impayées', impayes]].map(([lib, val]) => (
          <div key={lib as string} className="carte"><p className="text-sm text-slate-500">{lib}</p><p className="mt-1 text-2xl font-extrabold">{euros(val as number)}</p></div>
        ))}
      </div>
      <section>
        <div className="mb-3 flex items-center justify-between"><h1 className="text-xl font-extrabold">Mes devis</h1><Link to="/app/nouveau" className="btn-primaire">+ Nouveau</Link></div>
        {devis.length === 0 ? (
          <div className="carte text-center">
            <p className="text-lg font-bold">Votre premier devis vous attend</p>
            <p className="mt-1 text-slate-600">Dictez le chantier, FlashDevis rédige les lignes. Une minute, montre en main.</p>
            <Link to="/app/nouveau" className="btn-primaire mt-4">⚡ Créer un devis</Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {devis.map((d, i) => (
              <li key={d.id}>
                <Link to={`/app/devis/${d.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{d.titre}</p>
                    <p className="truncate text-sm text-slate-500">{d.numero} · {d.client.nom || 'Client sans nom'} · {new Date(d.dateCreation).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUTS[d.statut].style}`}>{d.facture?.payee ? 'Payé' : STATUTS[d.statut].libelle}</span>
                    <span className="font-bold">{euros(ttc(i))}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
