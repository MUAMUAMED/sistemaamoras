import { create } from 'zustand';
import { AuthUser } from '../types';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  
  login: (token: string, user: AuthUser) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    set({
      token,
      user,
      isAuthenticated: true,
      isLoading: false,
    });
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },
  
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
  
  checkAuth: () => {
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');
    
    if (token && userString) {
      try {
        const user = JSON.parse(userString);
        set({
          token,
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        // Se houver erro ao parsear o usuário, fazer logout
        get().logout();
      }
    } else {
      set({ isLoading: false });
    }
  },
})); 