// Page publique où le client consulte et signe le devis.
// shortcut: en version démo, le devis est lu dans le navigateur de l'artisan ; la signature à distance demande Supabase (version 2).
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Logo } from '../components/Cadre';
import { euros, totalLigne, totaux } from '../lib/calcul';
import { enregistrerDevis, useEtat } from '../lib/store';

export default function Signature() {
  const { id } = useParams();
  const { devis, entreprise } = useEtat();
  const d = devis.find(x => x.id === id);
  const toile = useRef<HTMLCanvasElement>(null);
  const [nom, setNom] = useState('');
  const [trace, setTrace] = useState(false);

  useEffect(() => {
    const c = toile.current; if (!c) return;
    const g = c.getContext('2d')!; g.lineWidth = 2.5; g.lineCap = 'round'; g.strokeStyle = '#111827';
    let dessin = false;
    const pos = (ev: PointerEvent) => { const r = c.getBoundingClientRect(); return [(ev.clientX - r.left) * (c.width / r.width), (ev.clientY - r.top) * (c.height / r.height)]; };
    const bas = (ev: PointerEvent) => { dessin = true; c.setPointerCapture(ev.pointerId); const [x, y] = pos(ev); g.beginPath(); g.moveTo(x, y); };
    const bouge = (ev: PointerEvent) => { if (!dessin) return; const [x, y] = pos(ev); g.lineTo(x, y); g.stroke(); setTrace(true); };
    const haut = () => { dessin = false; };
    c.addEventListener('pointerdown', bas); c.addEventListener('pointermove', bouge); c.addEventListener('pointerup', haut);
    return () => { c.removeEventListener('pointerdown', bas); c.removeEventListener('pointermove', bouge); c.removeEventListener('pointerup', haut); };
  }, [d?.id]);

  if (!d) return <div className="mx-auto max-w-lg p-6"><Logo /><p className="carte mt-6">Ce devis est introuvable ou n’est plus disponible.</p></div>;
  const t = totaux(d.lignes, entreprise.regimeTva);
  const effacer = () => { const c = toile.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); setTrace(false); };
  const signer = () => enregistrerDevis({ ...d, statut: 'signe', signature: { nom, date: new Date().toISOString(), image: toile.current!.toDataURL('image/png') } });

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4">
      <Logo />
      <section className="carte">
        <p className="text-sm text-slate-500">Devis {d.numero} · {entreprise.nom}</p>
        <h1 className="text-2xl font-extrabold">{d.titre}</h1>
        <ul className="mt-4 divide-y divide-slate-100 text-sm">{d.lignes.map(l => <li key={l.id} className="flex justify-between gap-3 py-2"><span>{l.designation} <span className="text-slate-500">({l.quantite} {l.unite})</span></span><span className="font-medium">{euros(totalLigne(l))}</span></li>)}</ul>
        <p className="mt-3 text-right text-lg font-extrabold">{entreprise.regimeTva === 'franchise' ? 'Total' : 'Total TTC'} : {euros(t.ttc)}</p>
      </section>
      {d.signature ? (
        <p className="carte bg-green-50 text-green-800">Devis signé par {d.signature.nom} le {new Date(d.signature.date).toLocaleDateString('fr-FR')}. Merci !</p>
      ) : (
        <section className="carte space-y-3">
          <h2 className="text-lg font-bold">Bon pour accord</h2>
          <label><span className="etiquette">Votre nom</span><input className="champ" value={nom} onChange={e => setNom(e.target.value)} /></label>
          <div><span className="etiquette">Votre signature</span><canvas ref={toile} width={600} height={200} className="h-40 w-full touch-none rounded-xl border border-dashed border-slate-400 bg-white" aria-label="Zone de signature" /></div>
          <div className="flex gap-2"><button className="btn-secondaire" onClick={effacer}>Effacer</button><button className="btn-primaire" disabled={!nom.trim() || !trace} onClick={signer}>Signer le devis</button></div>
          <p className="text-xs text-slate-500">En signant, vous acceptez le devis et ses conditions.</p>
        </section>
      )}
    </div>
  );
}
