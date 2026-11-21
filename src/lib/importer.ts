// Import d'un devis ou d'une facture existant : photo réduite (2000 px, JPEG) ou PDF de 3 Mo au plus, lu par le serveur
import { jetonAcces } from './supabase';

export interface DocumentLu { titre: string; client: { nom: string; adresse: string; email: string; telephone: string }; lignes: { designation: string; quantite: number; unite: string; prix_unitaire_ht: number; taux_tva: number }[]; remarques: string[] }

const enBase64 = (b: Blob) => new Promise<string>((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = () => ko(new Error('Fichier illisible.')); r.readAsDataURL(b); });

async function photoReduite(f: File): Promise<string> {
  const url = URL.createObjectURL(f);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('Photo illisible.')); i.src = url; });
    const k = Math.min(1, 2000 / Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85).split(',')[1];
  } finally { URL.revokeObjectURL(url); }
}

export async function importerDocument(f: File): Promise<DocumentLu> {
  const pdf = f.type === 'application/pdf';
  if (!pdf && !f.type.startsWith('image/')) throw new Error('Choisissez un PDF ou une photo.');
  if (pdf && f.size > 3_000_000) throw new Error('PDF trop lourd (3 Mo au plus).');
  const donnees = pdf ? await enBase64(f) : await photoReduite(f);
  const jeton = await jetonAcces();
  const r = await fetch('/api/importer-document', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) }, body: JSON.stringify({ media: pdf ? 'application/pdf' : 'image/jpeg', donnees }) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.erreur || 'Le document n’a pas pu être lu.');
  return data as DocumentLu;
}
