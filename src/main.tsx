import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import Accueil from './pages/Accueil';
import Cadre from './components/Cadre';
import TableauDeBord from './pages/TableauDeBord';
import EditeurDevis from './pages/EditeurDevis';
import DetailDevis from './pages/DetailDevis';
import Parametres from './pages/Parametres';
import Signature from './pages/Signature';
import Connexion from './pages/Connexion';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/s/:jeton" element={<Signature />} />
        <Route path="/connexion" element={<Connexion />} />
        <Route path="/app" element={<Cadre />}>
          <Route index element={<TableauDeBord />} />
          <Route path="nouveau" element={<EditeurDevis />} />
          <Route path="devis/:id" element={<DetailDevis />} />
          <Route path="devis/:id/modifier" element={<EditeurDevis />} />
          <Route path="parametres" element={<Parametres />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
