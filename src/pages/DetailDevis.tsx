// Fiche d'un devis : où il en est (frise), ce qu'il faut savoir (encart), et un seul grand bouton pour l'étape suivante.
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Feuille } from '../components/Elements';
import { IcCoche, IcCorbeille, IcCrayon, IcEuro, IcHorloge, IcLien, IcPdf, IcRetour, IcSuite } from '../components/Icones';
import { euros, partAcompte, totalLigne, totaux } from '../lib/calcul';
import { envoyerDevis, lienSignature, relancerAcompte, relancerDevis, relancerFacture } from '../lib/messages';
import { pdfDocument } from '../lib/pdf';
import { enregistrerDevis, facturerAcompte, facturerDevis, supprimerDevis, useEtat } from '../lib/store';
import { dateEnvoi, etape, jours, RELANCE_DEVIS_J, RELANCE_FACTURE_J } from '../lib/suivi';
import type { Devis } from '../lib/types';

const ETAPES = ['Rédigé', 'Envoyé', 'Signé', 'Facturé', 'Payé'] as const;
const RANG = { brouillon: 0, envoye: 1, refuse: 1, signe: 2, facture: 3, payee: 4 } as const;
const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '');
const prenom = (d: Devis) => d.client.nom || 'le client';

function Frise({ d }: { d: Devis }) {
  const e = etape(d), r = RANG[e], fini = e === 'payee';
  return (
    <div className="mt-5" aria-label={`Étape : ${ETAPES[r]}`}>
      <div className="flex items-center">
        {ETAPES.map((_, i) => <span key={i} className="contents">
          {i > 0 && <span className={`h-0.5 flex-1 ${i <= r ? 'bg-encre-900' : 'bg-trait'}`} />}
          <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-extrabold ${i < r || (fini && i === r) ? 'bg-encre-900 text-white' : i === r ? (e === 'refuse' ? 'bg-alerte text-white' : 'bg-flash-500 text-encre-900 shadow-[0_0_0_4px_#fff3d1]') : 'border-2 border-trait bg-white'}`}>
            {i < r || (fini && i === r) ? <IcCoche className="h-3.5 w-3.5" /> : i === r ? (e === 'refuse' ? '×' : i + 1) : ''}
          </span>
        </span>)}
      </div>
      <div className="-mx-2.5 mt-1.5 grid grid-cols-5 text-center text-[11px] font-semibold text-gris">{ETAPES.map((l, i) => <span key={l} className={i <= r ? 'text-encre-900' : ''}>{i === 1 && e === 'refuse' ? 'Refusé' : l}</span>)}</div>
    </div>
  );
}

function Encart({ d }: { d: Devis }) {
  const e = etape(d);
  let ton = 'bg-creme', titre = '', texte: ReactNode = '';
  if (e === 'brouillon') { titre = 'Pas encore envoyé'; texte = `Envoyez-le à ${prenom(d)} : il pourra le signer sur son téléphone, sans compte.`; }
  if (e === 'envoye') {
    const j = jours(dateEnvoi(d));
    ton = j >= RELANCE_DEVIS_J ? 'bg-flash-100' : 'bg-info-pale';
    titre = j === 0 ? 'Envoyé aujourd’hui' : j >= RELANCE_DEVIS_J ? `Pas de réponse depuis ${j} jours` : `Envoyé il y a ${j} jour${j > 1 ? 's' : ''}`;
    texte = d.ouvertures ? `Le lien a été ouvert ${d.ouvertures} fois, la dernière le ${date(d.ouvertLe)}.` : 'Le client n’a pas encore ouvert le lien.';
  }
  if (e === 'signe') {
    ton = 'bg-ok-pale'; titre = d.signature ? `Signé par ${d.signature.nom} le ${date(d.signature.date)}` : 'Marqué comme signé';
    texte = !d.acompte ? 'Facturez l’acompte, faites les travaux, puis facturez le solde en un geste.'
      : d.acompte.payee ? `Acompte ${d.acompte.numero} payé. Une fois les travaux faits, facturez le solde.`
      : `Acompte ${d.acompte.numero} facturé le ${date(d.acompte.date)}, en attente de paiement.`;
    if (d.acompte && !d.acompte.payee && jours(d.acompte.date) >= RELANCE_DEVIS_J) ton = 'bg-alerte-pale';
  }
  if (e === 'facture') { const j = jours(d.facture!.date); ton = j >= RELANCE_FACTURE_J ? 'bg-alerte-pale' : 'bg-flash-100'; titre = `Facture ${d.facture!.numero} · ${j >= RELANCE_FACTURE_J ? `impayée depuis ${j} jours` : `émise le ${date(d.facture!.date)}`}`; texte = 'Marquez-la payée dès réception du virement.'; }
  if (e === 'payee') { ton = 'bg-ok-pale'; titre = `Payée${d.payeeLe ? ` le ${date(d.payeeLe)}` : ''}`; texte = `Facture ${d.facture!.numero} réglée. Chantier bouclé.`; }
  if (e === 'refuse') { titre = 'Refusé par le client'; texte = 'Vous pouvez l’ajuster et le renvoyer.'; }
  return <div className={`mt-4 flex gap-2.5 rounded-[14px] px-3.5 py-3 text-[13px] ${ton}`}><IcHorloge className="mt-0.5 h-5 w-5 shrink-0 text-encre-600" /><div><b className="block text-sm">{titre}</b>{texte}</div></div>;
}

export default function DetailDevis() {
  const { id } = useParams();
  const { devis, entreprise } = useEtat();
  const nav = useNavigate();
  const [menu, setMenu] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [info, setInfo] = useState('');
  const d = devis.find(x => x.id === id);
  if (!d) return <div className="mt-10 text-center text-gris">Ce devis n’existe pas. <Link to="/app/devis" className="underline">Retour</Link></div>;
  const t = totaux(d.lignes, entreprise.regimeTva);
  const e = etape(d);

  const faire = (f: () => Promise<unknown>) => async () => {
    setMenu(false); setOccupe(true); setInfo('');
    try { await f(); } catch { setInfo('L’opération n’a pas pu être enregistrée. Vérifiez votre connexion.'); } finally { setOccupe(false); }
  };
  const maj = (patch: Partial<Devis>) => enregistrerDevis({ ...d, ...patch });
  const pdf = (mode: 'devis' | 'facture' | 'acompte') => faire(async () => pdfDocument(d, entreprise, mode).save(`${mode === 'facture' ? d.facture!.numero : mode === 'acompte' ? d.acompte!.numero : d.numero}.pdf`));
  const envoyer = faire(async () => { if (await envoyerDevis(d, entreprise)) if (d.statut === 'brouillon' || d.statut === 'refuse') await maj({ statut: 'envoye' }); });
  const copier = faire(async () => { await navigator.clipboard.writeText(lienSignature(d)); setInfo('Lien de signature copié.'); });

  // La prochaine étape, en grand
  const impayeLongtemps = e === 'facture' && jours(d.facture!.date) >= RELANCE_FACTURE_J;
  const pct = entreprise.acomptePct, partDevis = partAcompte(t, d.acompte?.pct ?? pct);
  const acompteDu = d.acompte && !d.acompte.payee, acompteEnRetard = acompteDu && jours(d.acompte!.date) >= RELANCE_DEVIS_J;
  const payerAcompte = faire(() => maj({ acompte: { ...d.acompte!, payee: true } }));
  const facturerSolde: [string, () => void] = [d.acompte ? `Facturer le solde (${euros(t.ttc - partDevis.ttc)})` : 'Transformer en facture', faire(() => facturerDevis(d))];
  const principal: [string, () => void] =
    e === 'brouillon' ? [`Envoyer à ${prenom(d)}`, envoyer]
    : e === 'envoye' ? [`Relancer ${prenom(d)}`, faire(() => relancerDevis(d, entreprise))]
    : e === 'signe' && !d.acompte && pct > 0 ? [`Facturer l’acompte (${euros(partDevis.ttc)})`, faire(() => facturerAcompte(d, pct))]
    : e === 'signe' && acompteEnRetard ? [`Relancer pour l’acompte`, faire(() => relancerAcompte(d, entreprise))]
    : e === 'signe' && acompteDu ? ['Marquer l’acompte payé', payerAcompte]
    : e === 'signe' ? facturerSolde
    : impayeLongtemps ? [`Relancer ${prenom(d)}`, faire(() => relancerFacture(d, entreprise))]
    : e === 'facture' ? ['Marquer comme payée', faire(() => maj({ facture: { ...d.facture!, payee: true } }))]
    : e === 'payee' ? ['PDF de la facture', pdf('facture')]
    : ['Modifier le devis', () => nav(`/app/devis/${d.id}/modifier`)];

  const secondaires: [typeof IcPdf, string, () => void, boolean?][] = [
    [IcPdf, 'PDF du devis', pdf('devis')],
    ...(d.acompte ? [[IcPdf, 'PDF de la facture d’acompte', pdf('acompte')] as [typeof IcPdf, string, () => void]] : []),
    ...(acompteDu && (acompteEnRetard || e !== 'signe') ? [[IcEuro, 'Marquer l’acompte payé', payerAcompte] as [typeof IcPdf, string, () => void]] : []),
    ...(e === 'signe' && d.acompte && !d.acompte.payee ? [[IcPdf, facturerSolde[0], facturerSolde[1]] as [typeof IcPdf, string, () => void]] : []),
    ...(e === 'signe' && !d.acompte && pct > 0 ? [[IcPdf, 'Facturer directement le total', faire(() => facturerDevis(d))] as [typeof IcPdf, string, () => void]] : []),
    ...(d.facture && e !== 'payee' ? [[IcPdf, 'PDF de la facture', pdf('facture')] as [typeof IcPdf, string, () => void]] : []),
    ...(!d.facture && e !== 'brouillon' ? [[IcLien, 'Copier le lien de signature', copier] as [typeof IcPdf, string, () => void]] : []),
    ...(e === 'envoye' ? [[IcCoche, 'Marquer comme signé', faire(() => maj({ statut: 'signe' }))] as [typeof IcPdf, string, () => void], [IcCorbeille, 'Marquer comme refusé', faire(() => maj({ statut: 'refuse' }))] as [typeof IcPdf, string, () => void]] : []),
    ...(e === 'envoye' || e === 'refuse' ? [[IcLien, 'Renvoyer le devis', envoyer] as [typeof IcPdf, string, () => void]] : []),
    ...(impayeLongtemps ? [[IcEuro, 'Marquer comme payée', faire(() => maj({ facture: { ...d.facture!, payee: true } }))] as [typeof IcPdf, string, () => void]] : []),
    ...(!d.facture && !d.acompte && e !== 'refuse' ? [[IcCrayon, 'Modifier', () => nav(`/app/devis/${d.id}/modifier`)] as [typeof IcPdf, string, () => void]] : []),
    ...(!d.facture && !d.acompte ? [[IcCorbeille, 'Supprimer le devis', () => { if (confirm('Supprimer ce devis ?')) faire(async () => { await supprimerDevis(d.id); nav('/app/devis', { replace: true }); })(); }, true] as [typeof IcPdf, string, () => void, boolean]] : []),
  ];

  return (
    <div>
      <button onClick={() => (history.length > 1 ? nav(-1) : nav('/app/devis'))} className="mb-3.5 mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-gris"><IcRetour className="h-5 w-5" />Retour</button>
      <p className="text-[13px] font-semibold text-gris">{d.numero}{d.facture && ` · ${d.facture.numero}`} · créé le {date(d.dateCreation)}</p>
      <h1 className="mb-1 mt-0.5 text-2xl font-extrabold leading-tight tracking-tight">{d.titre}</h1>
      <p className="text-sm text-encre-600">{d.client.nom || 'Client sans nom'}{d.client.adresse && ` · ${d.client.adresse}`}</p>
      <Frise d={d} />
      <Encart d={d} />

      <section className="mt-3.5 rounded-[18px] border border-trait bg-white px-3.5 py-1">
        {d.lignes.map(l => (
          <div key={l.id} className="flex justify-between gap-3 border-b border-[#f0ece4] py-2.5 text-[13.5px]">
            <div className="min-w-0">{l.designation}<span className="mt-0.5 block text-xs text-gris">{String(l.quantite).replace('.', ',')} {l.unite} × {euros(l.prixUnitaireHt)}{l.estimation && <> · <span className="font-semibold text-flash-700">prix estimé</span></>}</span></div>
            <b className="shrink-0">{euros(totalLigne(l))}</b>
          </div>
        ))}
        {entreprise.regimeTva === 'normal' && <div className="space-y-0.5 pt-2.5 text-[13px] text-gris">
          <div className="flex justify-between"><span>Total HT</span><span>{euros(t.ht)}</span></div>
          {t.tva.map(v => <div key={v.taux} className="flex justify-between"><span>TVA {String(v.taux).replace('.', ',')} %</span><span>{euros(v.montant)}</span></div>)}
        </div>}
        <div className="flex justify-between py-3 text-[17px] font-extrabold"><span>{entreprise.regimeTva === 'franchise' ? 'Total' : 'Total TTC'}</span><span>{euros(t.ttc)}</span></div>
        {d.acompte ? <div className="-mt-2 flex justify-between pb-1 text-[13px] text-gris"><span>Acompte {d.acompte.numero} ({d.acompte.pct} %) · {d.acompte.payee ? 'payé' : 'à encaisser'}</span><span>{euros(partDevis.ttc)}</span></div>
          : pct > 0 && !d.facture && <div className="-mt-2 flex justify-between pb-3 text-[13px] text-gris"><span>Acompte {pct} %</span><span>{euros(partDevis.ttc)}</span></div>}
        {d.acompte && <div className="flex justify-between pb-3 text-[13px] font-semibold"><span>{d.facture ? 'Reste à payer' : 'Solde à facturer'}</span><span>{euros(t.ttc - partDevis.ttc)}</span></div>}
      </section>
      {d.remarques && <p className="mt-3 whitespace-pre-line rounded-[14px] bg-white px-3.5 py-3 text-[13px] text-encre-600">{d.remarques}</p>}
      {info && <p role="status" className="mt-3 text-center text-sm text-encre-600">{info}</p>}

      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-papier from-75% to-transparent px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
        <div className="mx-auto flex max-w-lg gap-2">
          <button onClick={principal[1]} disabled={occupe} className="btn-primaire btn-grand flex-1">{occupe ? 'Un instant…' : principal[0]}</button>
          <button onClick={pdf(d.facture ? 'facture' : 'devis')} aria-label={d.facture ? 'Télécharger la facture en PDF' : 'Télécharger le devis en PDF'} className="flex min-h-14 w-16 flex-col items-center justify-center rounded-2xl border border-trait bg-white text-[11px] font-bold"><IcPdf className="h-5 w-5" />PDF</button>
          <button onClick={() => setMenu(true)} aria-label="Autres actions" className="grid min-h-14 w-14 place-items-center rounded-2xl border border-trait bg-white"><IcSuite className="h-[22px] w-[22px]" /></button>
        </div>
      </div>
      <Feuille ouverte={menu} fermer={() => setMenu(false)}>
        <ul>{secondaires.map(([Ic, lib, f, danger]) => (
          <li key={lib}><button onClick={f} className={`flex w-full items-center gap-3 border-b border-[#f0ece4] px-1 py-3.5 text-left text-[15px] font-semibold last:border-0 ${danger ? 'text-alerte' : ''}`}><Ic className="h-5 w-5" />{lib}</button></li>
        ))}</ul>
      </Feuille>
    </div>
  );
}
