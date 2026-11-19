import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './index.css';
import Accueil from './pages/Accueil';
import Cadre from './components/Cadre';
import TableauDeBord from './pages/TableauDeBord';
import EditeurDevis from './pages/EditeurDevis';
import DetailDevis from './pages/DetailDevis';
import ListeDevis from './pages/ListeDevis';
import { FicheClient, ListeClients } from './pages/Clients';
import Profil, { RubriqueProfil } from './pages/Profil';
import Signature from './pages/Signature';
import Connexion from './pages/Connexion';
import Legal from './pages/Legal';
import Bienvenue from './pages/Bienvenue';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/s/:jeton" element={<Signature />} />
        <Route path="/connexion" element={<Connexion />} />
        {['/mentions-legales', '/conditions', '/confidentialite'].map(p => <Route key={p} path={p} element={<Legal />} />)}
        <Route path="/app" element={<Cadre />}>
          <Route index element={<TableauDeBord />} />
          <Route path="bienvenue" element={<Bienvenue />} />
          <Route path="nouveau" element={<EditeurDevis />} />
          <Route path="devis/:id" element={<DetailDevis />} />
          <Route path="devis/:id/modifier" element={<EditeurDevis />} />
          <Route path="devis" element={<ListeDevis />} />
          <Route path="clients" element={<ListeClients />} />
          <Route path="clients/:cle" element={<FicheClient />} />
          <Route path="profil" element={<Profil />} />
          <Route path="profil/:section" element={<RubriqueProfil />} />
          <Route path="parametres" element={<Navigate to="/app/profil" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
