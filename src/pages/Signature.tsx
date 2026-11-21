// Page publique où le client consulte et signe le devis, par le lien secret reçu (sans compte).
// Avec Supabase, le client ne voit que ce devis via la fonction devis_public ; en mode démo, le devis est lu dans ce navigateur.
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Logo } from '../components/Cadre';
import { euros, totalLigne, totaux } from '../lib/calcul';
import { enregistrerDevis, getEtat, noterOuverture } from '../lib/store';
import { supabase } from '../lib/supabase';
import type { Ligne, RegimeTva } from '../lib/types';

interface Vue { numero: string; titre: string; lignes: Ligne[]; entreprise: string; regime: RegimeTva; signature?: { nom: string; date: string } }

function vueLocale(jeton: string): Vue | null {
  const { devis, entreprise } = getEtat();
  const d = devis.find(x => (x.jeton ?? x.id) === jeton);
  return d ? { numero: d.numero, titre: d.titre, lignes: d.lignes, entreprise: entreprise.nom, regime: entreprise.regimeTva, signature: d.signature } : null;
}

export default function Signature() {
  const { jeton = '' } = useParams();
  const [vue, setVue] = useState<Vue | null | 'chargement'>(supabase ? 'chargement' : vueLocale(jeton));
  const toile = useRef<HTMLCanvasElement>(null);
  const [nom, setNom] = useState('');
  const [trace, setTrace] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (!supabase) return;
    noterOuverture(jeton);
    supabase.rpc('devis_public', { p_jeton: jeton }).then(({ data, error }) => {
      if (error || !data) return setVue(null);
      setVue({ numero: data.numero, titre: data.titre, lignes: data.lignes, entreprise: data.entreprise?.nom ?? '', regime: data.entreprise?.regime_tva ?? 'normal', signature: data.signature ?? undefined });
    });
  }, [jeton]);

  const pret = vue && vue !== 'chargement' && !vue.signature;
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
  }, [pret]);

  if (vue === 'chargement') return <p className="mt-20 text-center text-slate-500">Chargement…</p>;
  if (!vue) return <div className="mx-auto max-w-lg p-6"><Logo /><p className="carte mt-6">Ce devis est introuvable ou n’est plus disponible.</p></div>;
  const t = totaux(vue.lignes, vue.regime);
  const effacer = () => { const c = toile.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); setTrace(false); };

  async function signer() {
    const image = toile.current!.toDataURL('image/png');
    setEnvoi(true); setErreur('');
    try {
      if (supabase) {
        const { data, error } = await supabase.rpc('signer_devis', { p_jeton: jeton, p_nom: nom.trim(), p_image: image });
        if (error) throw error;
        if (!data) { setErreur('Ce devis ne peut plus être signé. Contactez votre artisan.'); return; }
        // prévient l'artisan par e-mail ; un échec ne doit pas gêner le client
        fetch('/api/notifier-signature', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jeton }) }).catch(() => undefined);
      } else {
        const d = getEtat().devis.find(x => (x.jeton ?? x.id) === jeton)!;
        await enregistrerDevis({ ...d, statut: 'signe', signature: { nom: nom.trim(), date: new Date().toISOString(), image } });
      }
      setVue({ ...(vue as Vue), signature: { nom: nom.trim(), date: new Date().toISOString() } });
    } catch { setErreur('La signature n’a pas pu être enregistrée. Réessayez.'); }
    finally { setEnvoi(false); }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4">
      <Logo />
      <section className="carte">
        <p className="text-sm text-slate-500">Devis {vue.numero} · {vue.entreprise}</p>
        <h1 className="text-2xl font-extrabold">{vue.titre}</h1>
        <ul className="mt-4 divide-y divide-slate-100 text-sm">{vue.lignes.map(l => <li key={l.id} className="flex justify-between gap-3 py-2"><span>{l.designation} <span className="text-slate-500">({l.quantite} {l.unite})</span></span><span className="font-medium">{euros(totalLigne(l))}</span></li>)}</ul>
        <p className="mt-3 text-right text-lg font-extrabold">{vue.regime === 'franchise' ? 'Total' : 'Total TTC'} : {euros(t.ttc)}</p>
      </section>
      {vue.signature ? (
        <p className="carte bg-green-50 text-green-800">Devis signé par {vue.signature.nom} le {new Date(vue.signature.date).toLocaleDateString('fr-FR')}. Merci !</p>
      ) : (
        <section className="carte space-y-3">
          <h2 className="text-lg font-bold">Bon pour accord</h2>
          <label><span className="etiquette">Votre nom</span><input className="champ" value={nom} onChange={e => setNom(e.target.value)} maxLength={120} /></label>
          <div><span className="etiquette">Votre signature</span><canvas ref={toile} width={600} height={200} className="h-40 w-full touch-none rounded-xl border border-dashed border-slate-400 bg-white" aria-label="Zone de signature" /></div>
          <div className="flex gap-2"><button className="btn-secondaire" onClick={effacer}>Effacer</button><button className="btn-primaire" disabled={envoi || nom.trim().length < 2 || !trace} onClick={signer}>{envoi ? 'Envoi…' : 'Signer le devis'}</button></div>
          {erreur && <p role="alert" className="text-sm text-red-700">{erreur}</p>}
          <p className="text-xs text-slate-500">En signant, vous acceptez le devis et ses conditions.</p>
        </section>
      )}
    </div>
  );
}
