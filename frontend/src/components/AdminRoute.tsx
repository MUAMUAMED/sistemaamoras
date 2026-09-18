import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const storeUser = useAuthStore((state) => state.user);
  let storedRole = '';

  try {
    storedRole = JSON.parse(localStorage.getItem('user') || '{}')?.role || '';
  } catch {
    storedRole = '';
  }

  if ((storeUser?.role || storedRole) !== 'ADMIN') {
    return <Navigate to="/erp/dashboard" replace />;
  }

  return <>{children}</>;
}
