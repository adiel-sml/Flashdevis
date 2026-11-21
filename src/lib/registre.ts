// Services publics gratuits, sans clé : registre des entreprises (recherche-entreprises.api.gouv.fr) et adresses (Géoplateforme, BAN)

export interface EntrepriseTrouvee { nom: string; siren: string; siret: string; adresse: string; metier: string }

// Code d'activité (NAF) → métier proposé dans FlashDevis
const METIER_NAF: [RegExp, string][] = [
  [/^43\.22/, 'Plombier chauffagiste'], [/^43\.21/, 'Électricien'], [/^43\.34/, 'Peintre'], [/^43\.31/, 'Plaquiste'], [/^43\.33/, 'Carreleur'],
  [/^43\.32/, 'Menuisier'], [/^43\.99C|^41\.20/, 'Maçon'], [/^43\.91/, 'Couvreur'], [/^81\.30/, 'Paysagiste'], [/^43\.29|^43\.39|^43\.99/, 'Multiservice'],
];
export const metierDepuisNaf = (naf = '') => METIER_NAF.find(([r]) => r.test(naf))?.[1] ?? '';

interface Resultat { nom_complet?: string; siren?: string; activite_principale?: string; siege?: { siret?: string; adresse?: string; activite_principale?: string } }
export function versEntreprise(r: Resultat): EntrepriseTrouvee {
  return { nom: (r.nom_complet ?? '').replace(/\s+\(.*\)$/, ''), siren: r.siren ?? '', siret: r.siege?.siret ?? '', adresse: r.siege?.adresse ?? '', metier: metierDepuisNaf(r.siege?.activite_principale ?? r.activite_principale) };
}

export async function chercherEntreprise(q: string, signal?: AbortSignal): Promise<EntrepriseTrouvee[]> {
  const t = q.trim(); if (t.replace(/\s/g, '').length < 3) return [];
  const r = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(t)}&per_page=5&etat_administratif=A`, { signal });
  if (!r.ok) return [];
  const data = await r.json() as { results?: Resultat[] };
  return (data.results ?? []).map(versEntreprise);
}

export async function chercherAdresse(q: string, signal?: AbortSignal): Promise<string[]> {
  if (q.trim().length < 4) return [];
  const url = (base: string) => `${base}?q=${encodeURIComponent(q)}&limit=5&autocomplete=1`;
  for (const base of ['https://data.geopf.fr/geocodage/search', 'https://api-adresse.data.gouv.fr/search/']) {
    try {
      const r = await fetch(url(base), { signal });
      if (r.ok) return ((await r.json()) as { features?: { properties: { label: string } }[] }).features?.map(f => f.properties.label) ?? [];
    } catch (e) { if ((e as Error).name === 'AbortError') throw e; }
  }
  return [];
}
