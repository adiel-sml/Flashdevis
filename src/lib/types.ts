// Modèle de données de FlashDevis (stocké en local en mode démo, dans Supabase ensuite).

export type RegimeTva = 'normal' | 'franchise';

export interface Entreprise {
  nom: string;
  metier: string;
  siret: string;
  adresse: string;
  email: string;
  telephone: string;
  regimeTva: RegimeTva;
  numeroTva: string;
  assurance: string; // assurance décennale ou RC pro : obligatoire sur les devis du bâtiment
  validiteJours: number;
  conditionsPaiement: string;
  acomptePct: number;
}

export interface Tarif {
  id: string;
  designation: string;
  unite: string;
  prixHt: number;
}

export interface Client {
  nom: string;
  adresse: string;
  email: string;
  telephone: string;
}

export interface Ligne {
  id: string;
  designation: string;
  quantite: number;
  unite: string;
  prixUnitaireHt: number;
  tauxTva: number; // en pourcentage : 20, 10, 5.5 ou 0
  estimation: boolean; // prix proposé par l'assistant, à vérifier par l'artisan
}

export type StatutDevis = 'brouillon' | 'envoye' | 'signe' | 'refuse' | 'facture';

export interface Devis {
  id: string;
  numero: string;
  titre: string;
  client: Client;
  lignes: Ligne[];
  remarques: string;
  dateCreation: string; // ISO
  statut: StatutDevis;
  signature?: { nom: string; date: string; image: string };
  facture?: { numero: string; date: string; payee: boolean };
}

export const entrepriseVide: Entreprise = {
  nom: '', metier: '', siret: '', adresse: '', email: '', telephone: '',
  regimeTva: 'normal', numeroTva: '', assurance: '', validiteJours: 30,
  conditionsPaiement: 'Paiement à réception de facture, par virement.', acomptePct: 30,
};
