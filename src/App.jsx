import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import CheckoutPage from './pages/CheckoutPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import PublicSitePage from './pages/PublicSitePage.jsx';

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
      <Route path="/painel/*" element={<AdminPage />} />
      <Route path="/r/:slug" element={<LegacySite />} />
      {/* O site de cada restaurante é uma "pasta" do projeto: /<slug>, /<slug>/conta, /<slug>/mesa/12 */}
      <Route path="/:slug/*" element={<PublicSitePage />} />
      <Route path="*" element={<Navigate to="/entrar" replace />} />
    </Routes>
  );
}
