import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    // Verificar autenticação ao montar o componente
    checkAuth();
  }, [checkAuth]);

  // Verificar diretamente no localStorage como fallback
  const token = localStorage.getItem('token');
  const userString = localStorage.getItem('user');
  const hasAuthInStorage = !!(token && userString);

  // Mostrar loading apenas se estiver verificando
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Se não estiver autenticado no store E não houver dados no localStorage, redirecionar
  if (!isAuthenticated && !hasAuthInStorage) {
    return <Navigate to="/login" replace />;
  }

  // Se houver dados no localStorage mas o store não atualizou, considerar autenticado
  // (isso resolve problemas de timing após login)
  if (!isAuthenticated && hasAuthInStorage) {
    // Forçar atualização do store
    checkAuth();
    // Permitir acesso enquanto atualiza (evita loop de redirecionamento)
    return <>{children}</>;
  }

  return <>{children}</>;
} 