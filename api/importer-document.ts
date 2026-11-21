// Fonction serveur : lit un devis ou une facture existant (PDF ou photo) et en tire un brouillon de devis (client, lignes, objet).
// Sert à reprendre ses anciens documents ou ceux d'un autre logiciel sans tout ressaisir.
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Req, Res } from './_serveur.js';

const MODELE = process.env.FLASHDEVIS_MODEL || 'claude-haiku-5-5';
const TAILLE_MAX = 4_000_000;   // octets en base64 (la limite des fonctions Vercel est de 4,5 Mo par requête)

const Document = z.object({
  titre: z.string().describe('Objet du devis ou de la facture, en quelques mots'),
  client: z.object({ nom: z.string(), adresse: z.string(), email: z.string(), telephone: z.string() }).describe('Destinataire du document ; chaîne vide si absent'),
  lignes: z.array(z.object({
    designation: z.string(), quantite: z.number(), unite: z.string().describe('m², ml, m³, u, h, j, forfait, lot…'),
    prix_unitaire_ht: z.number().describe('Prix unitaire hors taxes en euros'), taux_tva: z.number().describe('20, 10, 5.5 ou 0'),
  })),
  remarques: z.array(z.string()).describe('Ce qui était illisible ou incertain, pour que l’artisan vérifie'),
});
const Entree = z.object({ media: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']), donnees: z.string().min(100).max(TAILLE_MAX) });

const CONSIGNES = `Tu lis un devis ou une facture d'artisan français (PDF ou photo) et tu en extrais le contenu pour le reprendre dans un nouveau devis.
- Recopie chaque ligne de prestation ou de fourniture telle qu'elle apparaît : désignation, quantité, unité, prix unitaire HT, taux de TVA.
- Si seul un prix TTC est indiqué, retrouve le HT à partir du taux de TVA. Si le taux n'est pas lisible, mets 20 et signale-le.
- Ignore les sous-totaux, totaux, acomptes, remises globales et mentions légales : ce ne sont pas des lignes.
- Le client est le destinataire du document, pas l'entreprise émettrice.
- N'invente rien : ce qui est illisible va dans remarques.`;

const fenetre = new Map<string, number[]>();   // repli si la base ne tient pas la limite (mode démo ou migration 0003 absente)
const tropDeRequetes = (cle: string, max = 10, ms = 3_600_000) => { const t = Date.now(), l = (fenetre.get(cle) ?? []).filter(x => t - x < ms); l.push(t); fenetre.set(cle, l); return l.length > max; };

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ erreur: 'Méthode non autorisée' });
  let cle = String(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'inconnu').split(',')[0].trim();
  const url = process.env.VITE_SUPABASE_URL, anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (url && anon) {
    const jeton = String(req.headers.authorization ?? '').replace(/^Bearer /, '');
    const { data } = jeton ? await createClient(url, anon, { auth: { persistSession: false } }).auth.getUser(jeton) : { data: { user: null } };
    if (!data.user) return res.status(401).json({ erreur: 'Connectez-vous pour importer un document.' });
    cle = data.user.id;
    const r = await createClient(url, anon, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${jeton}` } } }).rpc('consommer_generation');
    if (!r.error && r.data === false) return res.status(429).json({ erreur: 'Beaucoup d’imports aujourd’hui. Réessayez dans un moment.' });
    if (!r.error) cle = '';
  }
  if (cle && tropDeRequetes(cle)) return res.status(429).json({ erreur: 'Trop d’imports en une heure. Réessayez plus tard.' });
  const entree = Entree.safeParse(typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
  if (!entree.success) return res.status(400).json({ erreur: 'Choisissez un PDF ou une photo de moins de 3 Mo.' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ erreur: 'Service d’import non configuré.' });

  const { media, donnees } = entree.data;
  const piece = media === 'application/pdf'
    ? { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: donnees } }
    : { type: 'image' as const, source: { type: 'base64' as const, media_type: media, data: donnees } };
  try {
    const reponse = await new Anthropic().messages.parse({
      model: MODELE, max_tokens: 6000,
      system: [{ type: 'text', text: CONSIGNES, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: [piece, { type: 'text', text: 'Extrais le contenu de ce document.' }] }],
      output_config: { effort: 'low', format: zodOutputFormat(Document) },
    });
    if (reponse.stop_reason === 'refusal' || !reponse.parsed_output) return res.status(422).json({ erreur: 'Ce document n’a pas pu être lu. Essayez avec une photo plus nette.' });
    if (!reponse.parsed_output.lignes.length) return res.status(422).json({ erreur: 'Aucune ligne de devis trouvée dans ce document.' });
    return res.status(200).json(reponse.parsed_output);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return res.status(503).json({ erreur: 'Service saturé, réessayez dans un instant.' });
    if (e instanceof Anthropic.APIError) { console.error('Import :', e.status, e.message); return res.status(502).json({ erreur: 'Le document n’a pas pu être lu, réessayez.' }); }
    throw e;
  }
}
