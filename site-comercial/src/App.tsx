import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CartDrawer } from './components/cart/CartDrawer';
import { Header } from './components/layout/Header';
import { Home } from './pages/Home';
import { ProductDetail } from './pages/ProductDetail';
import { ShopPage } from './pages/ShopPage';
import { CommercialAdmin } from './pages/CommercialAdmin';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="app">
          <Header />
          <CartDrawer />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/produtos" element={<ShopPage />} />
              <Route path="/produtos/:categorySlug" element={<ShopPage />} />
              <Route path="/produto/:productSlug" element={<ProductDetail />} />
              <Route path="/admin" element={<CommercialAdmin />} />
              <Route path="/categorias" element={<ShopPage />} />
              <Route path="/sobre" element={<div>Sobre em breve</div>} />
              <Route path="/contato" element={<div>Contato em breve</div>} />
              <Route path="/conta" element={<div>Minha conta em breve</div>} />
            </Routes>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
