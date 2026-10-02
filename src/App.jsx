import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import CheckoutPage from './pages/CheckoutPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import PublicSitePage from './pages/PublicSitePage.jsx';
import StaffLoginPage from './pages/StaffLoginPage.jsx';
import OpsApp from './ops/OpsApp.jsx';
import TableQrPage from './ops/pages/TableQrPage.jsx';

/** Links antigos (/r/<slug>) continuam funcionando. */
function LegacySite() {
  const { slug } = useParams();
  return <Navigate to={`/${slug}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/assinar" element={<CheckoutPage />} />
      <Route path="/entrar" element={<LoginPage />} />
      {/* Equipe: cada colaborador entra pelo link que o gerente gerou */}
      <Route path="/equipe/:code" element={<StaffLoginPage />} />
      {/* Painel: operação do dia a dia; o editor do site fica em /painel/site */}
      <Route path="/painel/site/*" element={<AdminPage />} />
      <Route path="/painel/mesas/qrcodes" element={<TableQrPage />} />
      <Route path="/painel/*" element={<OpsApp />} />
      <Route path="/r/:slug" element={<LegacySite />} />
      {/* O site de cada restaurante é uma "pasta" do projeto: /<slug>, /<slug>/conta, /<slug>/mesa/12 */}
      <Route path="/:slug/*" element={<PublicSitePage />} />
      <Route path="*" element={<Navigate to="/entrar" replace />} />
    </Routes>
  );
}
