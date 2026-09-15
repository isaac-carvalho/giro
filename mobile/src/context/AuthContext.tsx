import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient, setUnauthenticatedHandler } from '../services/api';
import { StorageService } from '../services/storage';
import { SocketService } from '../services/socket';
import { UserType } from '../types';

export interface AuthUser {
  id: string;
  nome: string;
  telefone: string;
  tipo: UserType;
}

interface RegisterPayload {
  nome: string;
  telefone: string;
  email?: string;
  senha: string;
  tipo: 'passageiro' | 'motorista';
  biNumero?: string;
  veiculo?: {
    categoria: string;
    marca: string;
    modelo: string;
    ano?: number;
    matricula: string;
    cor: string;
  };
}

interface AuthState {
  user: AuthUser | null;
  restoring: boolean;
  signIn: (telefone: string, senha: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: (senha: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [restoring, setRestoring] = useState(true);

  const clearSession = useCallback(async () => {
    SocketService.disconnect();
    await StorageService.clearAuth();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthenticatedHandler(() => {
      SocketService.disconnect();
      setUser(null);
    });
  }, []);

  useEffect(() => {
    (async () => {
      const token = await StorageService.getRefreshToken();
      if (token) {
        const cached = await StorageService.getUser();
        if (cached) setUser(cached);
      }
      setRestoring(false);
    })();
  }, []);

  const persistSession = async (data: any) => {
    await StorageService.saveTokens(data.accessToken, data.refreshToken);
    await StorageService.saveUser(data.user);
    setUser(data.user);
  };

  const signIn = async (telefone: string, senha: string) => {
    const res = await apiClient.post('/auth/login', { telefone, senha });
    await persistSession(res.data);
  };

  const register = async (payload: RegisterPayload) => {
    const res = await apiClient.post('/auth/registar', payload);
    await persistSession(res.data);
  };

  const deleteAccount = async (senha: string) => {
    await apiClient.delete('/auth/conta', { data: { senha } });
    await clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, restoring, signIn, register, signOut: clearSession, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return ctx;
};
