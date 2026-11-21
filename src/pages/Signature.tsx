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

  if (vue === 'chargement') return <div className="grid min-h-screen place-items-center bg-papier"><span className="h-8 w-8 animate-spin rounded-full border-[3px] border-trait border-t-encre-900" aria-label="Chargement" /></div>;
  if (!vue) return <div className="min-h-screen bg-papier"><div className="mx-auto max-w-lg px-5 pt-6"><Logo /><p className="carte mt-8">Ce devis est introuvable ou n’est plus disponible.</p></div></div>;
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
    <div className="min-h-screen bg-papier pb-10">
      <div className="mx-auto max-w-lg space-y-4 px-5 pt-6">
        <p className="text-[13px] font-semibold text-gris">{vue.entreprise} · devis {vue.numero}</p>
        <h1 className="titre-page leading-tight">{vue.titre}</h1>
        <section className="rounded-[18px] border border-trait bg-white px-4 py-1">
          {vue.lignes.map(l => <div key={l.id} className="flex justify-between gap-3 border-b border-[#f0ece4] py-2.5 text-sm"><span>{l.designation}<span className="block text-xs text-gris">{String(l.quantite).replace('.', ',')} {l.unite}</span></span><b className="shrink-0">{euros(totalLigne(l))}</b></div>)}
          <div className="flex justify-between py-3 text-lg font-extrabold"><span>{vue.regime === 'franchise' ? 'Total' : 'Total TTC'}</span><span>{euros(t.ttc)}</span></div>
        </section>
        {vue.signature ? (
          <p className="rounded-2xl bg-ok-pale px-4 py-4 font-semibold text-ok">Devis signé par {vue.signature.nom} le {new Date(vue.signature.date).toLocaleDateString('fr-FR')}. Merci.</p>
        ) : (
          <section className="space-y-3 rounded-[18px] border border-trait bg-white p-4">
            <h2 className="text-lg font-extrabold">Bon pour accord</h2>
            <input className="champ" placeholder="Votre nom" aria-label="Votre nom" autoComplete="name" value={nom} onChange={e => setNom(e.target.value)} maxLength={120} />
            <div>
              <div className="mb-1 flex items-center justify-between"><span className="etiquette !mb-0">Votre signature</span>{trace && <button onClick={effacer} className="min-h-11 px-1 text-sm font-semibold text-gris">Effacer</button>}</div>
              <canvas ref={toile} width={600} height={220} className="h-44 w-full touch-none rounded-xl border-2 border-dashed border-gris/40 bg-papier" aria-label="Zone de signature : signez avec le doigt" />
            </div>
            <button className="btn-primaire btn-grand w-full" disabled={envoi || nom.trim().length < 2 || !trace} onClick={signer}>{envoi ? 'Envoi…' : 'Signer le devis'}</button>
            {erreur && <p role="alert" className="text-sm text-alerte">{erreur}</p>}
            <p className="text-xs text-gris">En signant, vous acceptez ce devis et ses conditions.</p>
          </section>
        )}
        <p className="pt-2 text-center"><Logo /></p>
      </div>
    </div>
  );
}
