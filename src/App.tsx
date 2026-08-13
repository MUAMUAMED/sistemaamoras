import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Scanner from './pages/Scanner';
import Leads from './pages/Leads';
import Settings from './pages/Settings';
import ERPDashboard from './pages/ERPDashboard';
import CRMDashboard from './pages/CRMDashboard';
import Kanban from './pages/Kanban';
import Categories from './pages/Categories';
import Subcategories from './pages/Subcategories';
import Patterns from './pages/Patterns';
import Sizes from './pages/Sizes';
import Fiscal from './pages/Fiscal';
import FiscalHistory from './pages/FiscalHistory';
import DanfeNfce from './pages/DanfeNfce';
import Pdv from './pages/Pdv';
import ManualFiscal from './pages/ManualFiscal';
import AdminRoute from './components/AdminRoute';
import { useAuthStore } from './stores/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Mantem os dados de navegacao no cache da aplicacao. As alteracoes de
      // estoque e produto continuam invalidando esta chave explicitamente.
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

function ERPLayout() {
  return (
    <Layout area="erp" />
  );
}

function CRMLayout() {
  return (
    <Layout area="crm" />
  );
}

export default function App() {
  const { user, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="App">
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
            } />
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>
            {/* ERP Area */}
            <Route element={<ProtectedRoute><ERPLayout /></ProtectedRoute>}>
              <Route path="/erp/dashboard" element={<ERPDashboard />} />
              <Route path="/erp/products" element={<Products />} />
              <Route path="/erp/categories" element={<Categories />} />
              <Route path="/erp/subcategories" element={<Subcategories />} />
              <Route path="/erp/patterns" element={<Patterns />} />
              <Route path="/erp/sizes" element={<Sizes />} />
              <Route path="/erp/sales" element={<Sales />} />
              <Route path="/erp/scanner" element={<Scanner />} />
              <Route path="/erp/pdv" element={<Pdv />} />
              <Route path="/erp/fiscal" element={<Fiscal />} />
              <Route path="/erp/fiscal/history" element={<FiscalHistory />} />
              <Route path="/erp/fiscal/manual" element={<AdminRoute><ManualFiscal /></AdminRoute>} />
              <Route path="/erp/fiscal/:id/danfe" element={<DanfeNfce />} />
              <Route path="/erp/settings" element={<Settings />} />
            </Route>
            {/* CRM Area */}
            <Route element={<ProtectedRoute><CRMLayout /></ProtectedRoute>}>
              <Route path="/crm/dashboard" element={<CRMDashboard />} />
              <Route path="/crm/leads" element={<Leads />} />
              <Route path="/crm/kanban" element={<Kanban />} />
              <Route path="/crm/sales" element={<Sales />} />
              <Route path="/crm/settings" element={<Settings />} />
            </Route>
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
