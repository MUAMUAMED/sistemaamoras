import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CartDrawer } from './components/cart/CartDrawer';
import { Header } from './components/layout/Header';
import { Home } from './pages/Home';
import { ProductDetail } from './pages/ProductDetail';
import { ShopPage } from './pages/ShopPage';
import { CommercialAdmin } from './pages/CommercialAdmin';
import { InstitutionalPage } from './pages/InstitutionalPage';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

function AppFrame() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className={`app ${isAdminRoute ? 'admin-route' : ''}`}>
      {!isAdminRoute && <Header />}
      {!isAdminRoute && <CartDrawer />}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/produtos" element={<ShopPage />} />
          <Route path="/produtos/:categorySlug" element={<ShopPage />} />
          <Route path="/produto/:productSlug" element={<ProductDetail />} />
          <Route path="/admin" element={<CommercialAdmin />} />
          <Route path="/categorias" element={<ShopPage />} />
          <Route path="/sobre" element={<InstitutionalPage kind="about" />} />
          <Route path="/contato" element={<InstitutionalPage kind="contact" />} />
          <Route path="/conta" element={<InstitutionalPage kind="account" />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppFrame />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
