// Génère le PDF d'un devis ou d'une facture, avec les mentions obligatoires en France.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { euros as eurosEcran, partAcompte, solde, totalLigne, totaux } from './calcul';
import type { Devis, Entreprise } from './types';

// jsPDF (Helvetica) n'a pas l'espace fine insécable du format français : remplacée par une espace simple
const euros = (n: number) => eurosEcran(n).replace(/[\u202f\u00a0]/g, ' ');
const date = (iso: string) => new Date(iso).toLocaleDateString('fr-FR');
const plusJours = (iso: string, j: number) => new Date(new Date(iso).getTime() + j * 86400000).toISOString();

export function pdfDocument(d: Devis, e: Entreprise, mode: 'devis' | 'facture' | 'acompte'): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ac = mode === 'acompte' ? d.acompte : undefined;          // facture d'acompte
  const facture = (mode === 'facture' && !!d.facture) || !!ac;     // tout document qui est une facture (mentions, pas de signature)
  const tDevis = totaux(d.lignes, e.regimeTva);
  const t = ac ? partAcompte(tDevis, ac.pct) : tDevis;
  const encre: [number, number, number] = [17, 24, 39], flash: [number, number, number] = [245, 168, 0];

  // En-tête : entreprise à gauche, document à droite
  doc.setFillColor(...flash).rect(0, 0, 210, 4, 'F');
  // Logo de l'artisan en haut à gauche (16 mm de haut, 45 mm de large au plus), le texte de l'en-tête passe dessous
  let yNom = 18;
  if (e.logo) {
    try {
      const p = doc.getImageProperties(e.logo), k = Math.min(45 / p.width, 16 / p.height);
      doc.addImage(e.logo, p.fileType, 15, 9, p.width * k, p.height * k); yNom = 32;
    } catch { /* image illisible : document sans logo */ }
  }
  doc.setTextColor(...encre).setFont('helvetica', 'bold').setFontSize(15).text(e.nom || 'Votre entreprise', 15, yNom);
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(70);
  const ident = [e.metier, e.adresse, [e.telephone, e.email].filter(Boolean).join(' · '), e.siret && `SIRET : ${e.siret}`, e.regimeTva === 'normal' && e.numeroTva && `TVA intracommunautaire : ${e.numeroTva}`].filter(Boolean) as string[];
  doc.text(ident.flatMap(l => doc.splitTextToSize(l, 95)), 15, yNom + 6);

  doc.setTextColor(...encre).setFont('helvetica', 'bold').setFontSize(20).text(ac ? 'FACTURE D’ACOMPTE' : facture ? 'FACTURE' : 'DEVIS', 195, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(70);
  const meta = ac
    ? [`N° ${ac.numero}`, `Date : ${date(ac.date)}`, 'Payable à réception', `Devis d’origine : ${d.numero}`]
    : facture
    ? [`N° ${d.facture!.numero}`, `Date : ${date(d.facture!.date)}`, `Échéance : ${date(plusJours(d.facture!.date, 30))}`, `Devis d’origine : ${d.numero}`]
    : [`N° ${d.numero}`, `Date : ${date(d.dateCreation)}`, `Valable jusqu’au ${date(plusJours(d.dateCreation, e.validiteJours))}`];
  doc.text(meta, 195, 24, { align: 'right' });

  // Client
  doc.setDrawColor(226).setFillColor(248, 250, 252).roundedRect(115, 44, 80, 30, 2, 2, 'FD');
  doc.setTextColor(120).setFontSize(8).text('CLIENT', 119, 50);
  doc.setTextColor(...encre).setFont('helvetica', 'bold').setFontSize(10).text(d.client.nom || 'Client', 119, 56);
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(70).text(doc.splitTextToSize([d.client.adresse, d.client.email, d.client.telephone].filter(Boolean).join('\n'), 72), 119, 61);

  doc.setTextColor(...encre).setFont('helvetica', 'bold').setFontSize(11).text(d.titre || 'Prestation', 15, 84);

  // Lignes
  const franchise = e.regimeTva === 'franchise';
  autoTable(doc, {
    startY: 89,
    head: [['Désignation', 'Qté', 'Unité', 'PU HT', ...(franchise ? [] : ['TVA']), 'Total HT']],
    body: ac
      // acompte : une ligne par taux de TVA, au prorata du devis signé
      ? (franchise || t.tva.length === 0 ? [{ taux: 0, base: t.ht }] : t.tva).map(v => [`Acompte de ${String(ac.pct).replace('.', ',')} % sur le devis ${d.numero}${t.tva.length > 1 ? ` (part à ${String(v.taux).replace('.', ',')} %)` : ''}`, '1', 'forfait', euros(v.base), ...(franchise ? [] : [`${String(v.taux).replace('.', ',')} %`]), euros(v.base)])
      : d.lignes.map(l => [l.designation, String(l.quantite).replace('.', ','), l.unite, euros(l.prixUnitaireHt), ...(franchise ? [] : [`${String(l.tauxTva).replace('.', ',')} %`]), euros(totalLigne(l))]),
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.5, textColor: encre },
    headStyles: { fillColor: encre, textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: franchise ? 90 : 78 }, 1: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 15, right: 15 },
  });

  // Totaux
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  const ligneTotal = (lib: string, val: string, gras = false) => {
    doc.setFont('helvetica', gras ? 'bold' : 'normal').setFontSize(gras ? 11 : 9.5).setTextColor(...encre);
    doc.text(lib, 118, y); doc.text(val, 195, y, { align: 'right' }); y += gras ? 7 : 5.5;
  };
  ligneTotal('Total HT', euros(t.ht));
  t.tva.forEach(v => ligneTotal(`TVA ${String(v.taux).replace('.', ',')} % sur ${euros(v.base)}`, euros(v.montant)));
  if (mode === 'facture' && d.acompte) {
    // facture finale : l'acompte déjà facturé est déduit
    const part = partAcompte(tDevis, d.acompte.pct), reste = solde(tDevis, part);
    ligneTotal(franchise ? 'Total' : 'Total TTC', euros(t.ttc), true);
    ligneTotal(`Acompte déduit (${d.acompte.numero})`, `- ${euros(part.ttc)}`);
    ligneTotal('Reste à payer', euros(reste.ttc), true);
  } else ligneTotal(franchise ? 'Total à payer' : 'Total TTC', euros(t.ttc), true);
  if (!facture && e.acomptePct > 0) ligneTotal(`Acompte à la signature (${e.acomptePct} %)`, euros(partAcompte(t, e.acomptePct).ttc));

  // Mentions
  y += 4;
  const mentions = [
    franchise && 'TVA non applicable, article 293 B du Code général des impôts.',
    e.conditionsPaiement && `Conditions de paiement : ${e.conditionsPaiement}`,
    e.assurance && `Assurance professionnelle : ${e.assurance}`,
    facture && 'En cas de retard de paiement, des pénalités au taux de trois fois le taux d’intérêt légal sont exigibles, ainsi qu’une indemnité forfaitaire de 40 € pour frais de recouvrement (clients professionnels). Pas d’escompte pour paiement anticipé.',
    !facture && 'Devis gratuit. Les travaux non prévus au présent devis feront l’objet d’un avenant.',
    d.remarques && `Remarques : ${d.remarques}`,
  ].filter(Boolean) as string[];
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(90);
  for (const m of mentions) { const lignes = doc.splitTextToSize(m, 180); if (y + lignes.length * 4 > 270) { doc.addPage(); y = 20; } doc.text(lignes, 15, y); y += lignes.length * 4 + 1.5; }

  // Signature du client (devis)
  if (!facture) {
    if (y > 235) { doc.addPage(); y = 20; }
    y += 4;
    doc.setDrawColor(200).roundedRect(115, y, 80, 34, 2, 2);
    doc.setFontSize(8).setTextColor(90).text('Bon pour accord, date et signature du client', 119, y + 6);
    if (d.signature) {
      doc.addImage(d.signature.image, 'PNG', 121, y + 9, 50, 18);
      doc.setTextColor(...encre).text(`${d.signature.nom}, le ${date(d.signature.date)}`, 119, y + 31);
    }
  }
  doc.setFontSize(7).setTextColor(150).text('Document réalisé avec FlashDevis', 105, 290, { align: 'center' });
  return doc;
}
