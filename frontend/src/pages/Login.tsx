import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [canCreateAccount, setCanCreateAccount] = useState(false);
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated, checkAuth } = useAuthStore();

  // Verificar se já está autenticado ao carregar a página
  useEffect(() => {
    checkAuth();
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate, checkAuth]);

  // Verificar se pode criar conta (primeiro usuário)
  useEffect(() => {
    const checkFirstUser = async () => {
      try {
        const response = await authApi.checkFirstUser();
        setCanCreateAccount(response.canCreateAccount);
        setShowRegister(response.canCreateAccount);
      } catch (error) {
        console.error('Erro ao verificar primeiro usuário:', error);
        setCanCreateAccount(false);
      }
    };
    checkFirstUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authApi.login({ email, password });
      
      // Se chegou aqui, o login foi bem-sucedido
      // Usar o método login do store
      login(response.token, response.user);
      
      toast.success('Login realizado com sucesso!');
      
      // Aguardar um pouco para garantir que o estado foi atualizado antes de navegar
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 50);
    } catch (error: any) {
      // Tratar diferentes tipos de erro
      let errorMessage = 'Erro ao fazer login. Verifique suas credenciais.';
      
      if (error?.response) {
        // Erro da API (401, 400, etc)
        errorMessage = error.response.data?.message || error.response.data?.error || errorMessage;
      } else if (error?.message) {
        // Erro de rede ou outro
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      
      // Limpar campo de senha em caso de erro
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!registerData.name || !registerData.email || !registerData.password) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (registerData.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsRegistering(true);

    try {
      const response = await authApi.register({
        name: registerData.name,
        email: registerData.email,
        password: registerData.password,
      });

      toast.success(response.message || 'Conta criada com sucesso!');
      
      // Se for o primeiro usuário, fazer login automático
      if (response.isFirstUser) {
        // Fazer login automaticamente
        const loginResponse = await authApi.login({
          email: registerData.email,
          password: registerData.password,
        });
        
        login(loginResponse.token, loginResponse.user);
        toast.success('Você foi logado automaticamente!');
        
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 50);
      } else {
        // Se não for primeiro usuário, voltar para login
        setShowRegister(false);
        setEmail(registerData.email);
        toast.success('Conta criada! Faça login para continuar.');
      }
    } catch (error: any) {
      let errorMessage = 'Erro ao criar conta. Tente novamente.';
      
      if (error?.response) {
        errorMessage = error.response.data?.message || error.response.data?.error || errorMessage;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            🌸 Sistema Amoras Capital
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {showRegister ? 'Crie sua conta de administrador' : 'Faça login para acessar o sistema'}
          </p>
        </div>

        {showRegister ? (
          // Formulário de Registro (primeiro usuário)
          <form className="mt-8 space-y-6" onSubmit={handleRegister}>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Primeira vez?</strong> Crie a conta de administrador do sistema. Esta opção só aparece uma vez.
              </p>
            </div>

            <div className="rounded-md shadow-sm space-y-3">
              <div>
                <label htmlFor="register-name" className="sr-only">Nome</label>
                <input
                  id="register-name"
                  name="name"
                  type="text"
                  required
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Nome completo"
                  value={registerData.name}
                  onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="register-email" className="sr-only">Email</label>
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  required
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="register-password" className="sr-only">Senha</label>
                <input
                  id="register-password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Senha (mínimo 6 caracteres)"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="register-confirm-password" className="sr-only">Confirmar Senha</label>
                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type="password"
                  required
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Confirmar senha"
                  value={registerData.confirmPassword}
                  onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowRegister(false)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={isRegistering}
                className="flex-1 py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isRegistering ? 'Criando...' : 'Criar Conta'}
              </button>
            </div>
          </form>
        ) : (
          // Formulário de Login
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Senha</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 