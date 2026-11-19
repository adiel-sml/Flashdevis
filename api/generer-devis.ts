// Fonction serveur Vercel : transforme la description d'un chantier (dictée ou tapée) en lignes de devis.
// La clé ANTHROPIC_API_KEY reste côté serveur, dans les variables d'environnement de Vercel.
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const MODELE = process.env.FLASHDEVIS_MODEL || 'claude-haiku-5-5'; // choisi par l'utilisateur pour économiser son crédit
const TEXTE_MAX = 2000;
const TARIFS_MAX = 80;

const LigneSchema = z.object({
  designation: z.string().describe('Libellé clair de la prestation ou de la fourniture, tel qu’il apparaîtra au client'),
  quantite: z.number(),
  unite: z.string().describe('m², ml, m³, u, h, j, forfait, lot…'),
  prix_unitaire_ht: z.number().describe('Prix unitaire hors taxes en euros'),
  taux_tva: z.number().describe('20, 10, 5.5 ou 0'),
  estimation: z.boolean().describe('true si le prix ne vient pas des tarifs de l’artisan'),
});
const DevisSchema = z.object({
  titre: z.string().describe('Objet du devis en quelques mots'),
  lignes: z.array(LigneSchema),
  remarques: z.array(z.string()).describe('Points à vérifier ou hypothèses faites, pour l’artisan'),
});
export type DevisGenere = z.infer<typeof DevisSchema>;

const Entree = z.object({
  texte: z.string().trim().min(5).max(TEXTE_MAX),
  metier: z.string().max(80).optional().default(''),
  regimeTva: z.enum(['normal', 'franchise']).default('normal'),
  tarifs: z.array(z.object({ designation: z.string().max(160), unite: z.string().max(20), prixHt: z.number() })).max(TARIFS_MAX).default([]),
});

const CONSIGNES = `Tu rédiges des devis pour des artisans et indépendants français.
À partir de la description d'un chantier ou d'une prestation, produis les lignes du devis.
Règles :
- Utilise en priorité les tarifs de l'artisan fournis : reprends leur désignation, leur unité et leur prix, avec estimation=false.
- Si une prestation n'a pas de tarif, propose un prix unitaire HT réaliste pour le marché français et mets estimation=true.
- Sépare la main d'œuvre et les fournitures quand c'est l'usage du métier. Ajoute la dépose, l'évacuation des gravats ou le déplacement seulement si c'est mentionné ou évident.
- Quantités et unités cohérentes avec la description (surface en m², longueur en ml, temps en h ou j, sinon u ou forfait).
- TVA : 20 % par défaut ; 10 % pour des travaux d'amélioration ou d'entretien d'un logement de plus de 2 ans ; 5,5 % pour la rénovation énergétique. En cas de doute, 20 % et une remarque. En franchise de TVA, taux_tva = 0 partout.
- N'invente ni nom de client, ni adresse, ni remise. Signale dans remarques ce qui est ambigu ou à confirmer.
- Désignations courtes et professionnelles, en français.`;

// Repli quand la base ne tient pas la limite (mode démo ou migration 0003 absente) : limite en mémoire par instance du serveur
const fenetre = new Map<string, number[]>();
function tropDeRequetes(ip: string, max = 20, ms = 60 * 60 * 1000) {
  const maintenant = Date.now(), liste = (fenetre.get(ip) ?? []).filter(t => maintenant - t < ms);
  liste.push(maintenant); fenetre.set(ip, liste);
  return liste.length > max;
}

interface Req { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }
interface Res { status(code: number): Res; json(body: unknown): void; setHeader(name: string, value: string): void }

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ erreur: 'Méthode non autorisée' });
  // Avec Supabase configuré, seule une session valide peut générer (protège le crédit) ; la limite s'applique par compte
  let cle = String(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'inconnu').split(',')[0].trim();
  const url = process.env.VITE_SUPABASE_URL, anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (url && anon) {
    const jeton = String(req.headers.authorization ?? '').replace(/^Bearer /, '');
    const { data } = jeton ? await createClient(url, anon, { auth: { persistSession: false } }).auth.getUser(jeton) : { data: { user: null } };
    if (!data.user) return res.status(401).json({ erreur: 'Connectez-vous pour générer un devis.' });
    cle = data.user.id;
    // Limite tenue par la base (20 par heure, 60 par jour) ; sans la migration 0003, repli sur la limite en mémoire ci-dessous
    const r = await createClient(url, anon, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${jeton}` } } }).rpc('consommer_generation');
    if (!r.error && r.data === false) return res.status(429).json({ erreur: 'Vous avez rédigé beaucoup de devis aujourd’hui. Réessayez dans un moment.' });
    if (!r.error) cle = '';
  }
  if (cle && tropDeRequetes(cle)) return res.status(429).json({ erreur: 'Trop de devis générés en une heure. Réessayez un peu plus tard.' });
  const entree = Entree.safeParse(typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
  if (!entree.success) return res.status(400).json({ erreur: 'Décrivez le chantier en quelques phrases (2 000 caractères au plus).' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ erreur: 'Service de génération non configuré.' });

  const { texte, metier, regimeTva, tarifs } = entree.data;
  const contexte = [
    metier && `Métier de l'artisan : ${metier}.`,
    `Régime de TVA : ${regimeTva === 'franchise' ? 'franchise en base (TVA non applicable)' : 'TVA normale'}.`,
    tarifs.length ? `Tarifs de l'artisan (désignation | unité | prix HT) :\n${tarifs.map(t => `${t.designation} | ${t.unite} | ${t.prixHt}`).join('\n')}` : 'Aucun tarif enregistré.',
  ].filter(Boolean).join('\n');

  const client = new Anthropic();
  try {
    const reponse = await client.messages.parse({
      model: MODELE,
      max_tokens: 4000,
      system: [{ type: 'text', text: CONSIGNES, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `${contexte}\n\nDescription du chantier :\n${texte}` }],
      output_config: { effort: 'low', format: zodOutputFormat(DevisSchema) },
    });
    if (reponse.stop_reason === 'refusal') return res.status(422).json({ erreur: 'Cette demande ne peut pas être transformée en devis.' });
    if (!reponse.parsed_output) return res.status(502).json({ erreur: 'Le devis n’a pas pu être généré, réessayez.' });
    const d = reponse.parsed_output;
    if (regimeTva === 'franchise') d.lignes.forEach(l => { l.taux_tva = 0; });
    return res.status(200).json(d);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return res.status(503).json({ erreur: 'Service saturé, réessayez dans un instant.' });
    if (e instanceof Anthropic.AuthenticationError) return res.status(500).json({ erreur: 'Clé du service invalide.' });
    if (e instanceof Anthropic.APIError) return res.status(502).json({ erreur: 'Le service de génération ne répond pas, réessayez.' });
    throw e;
  }
}
