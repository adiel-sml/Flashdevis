// Client Supabase. Sans variables d'environnement, l'appli tourne en mode démo (données dans le navigateur).
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const cle = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = url && cle ? createClient(url, cle, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
export const modeDemo = !supabase;

// Jeton de session envoyé à nos fonctions serveur pour prouver l'identité de l'artisan
export const jetonAcces = async () => (supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined);
