// Dictée vocale avec la reconnaissance vocale du navigateur (gratuite, sans serveur). Chrome, Edge et Safari la proposent.
import { useCallback, useEffect, useRef, useState } from 'react';

interface Resultat { isFinal: boolean; 0: { transcript: string } }
interface Evenement { resultIndex: number; results: ArrayLike<Resultat> }
interface Reconnaissance { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((e: Evenement) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null }
type Constructeur = new () => Reconnaissance;

const Reco = (typeof window !== 'undefined' && ((window as unknown as { SpeechRecognition?: Constructeur }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: Constructeur }).webkitSpeechRecognition)) || null;

export function useDictee(onTexte: (texteFinal: string) => void) {
  const [ecoute, setEcoute] = useState(false);
  const [provisoire, setProvisoire] = useState('');
  const [erreur, setErreur] = useState('');
  const reco = useRef<Reconnaissance | null>(null);
  const rappel = useRef(onTexte);
  useEffect(() => { rappel.current = onTexte; }, [onTexte]);

  const arreter = useCallback(() => { reco.current?.stop(); }, []);
  const demarrer = useCallback(() => {
    if (!Reco) { setErreur('La dictée n’est pas disponible sur ce navigateur. Utilisez le micro de votre clavier.'); return; }
    const r = new Reco();
    r.lang = 'fr-FR'; r.continuous = true; r.interimResults = true;
    r.onresult = e => {
      let prov = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) rappel.current(res[0].transcript.trim()); else prov += res[0].transcript;
      }
      setProvisoire(prov);
    };
    r.onerror = e => setErreur(e.error === 'not-allowed' ? 'Autorisez le micro pour dicter.' : 'La dictée s’est interrompue.');
    r.onend = () => { setEcoute(false); setProvisoire(''); };
    reco.current = r; setErreur(''); setEcoute(true); r.start();
  }, []);
  useEffect(() => () => reco.current?.stop(), []);
  return { disponible: !!Reco, ecoute, provisoire, erreur, demarrer, arreter };
}
