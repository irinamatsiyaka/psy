import axios from 'axios';
import type { AuthResponse, AuthUser, UserRole, Language } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5012';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

type Credentials = {
  email: string;
  password: string;
};

type RegisterPayload = Credentials & {
  fullName: string;
  username?: string;
  roles: UserRole[];
  preferredLanguage?: Language;
};

export const authStorageKey = 'psy_access_token';

export const login = async (payload: Credentials): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/auth/login', payload);
  return data;
};

export const register = async (payload: RegisterPayload): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/auth/register', payload);
  return data;
};

export const me = async (accessToken: string): Promise<AuthUser> => {
  const { data } = await api.get<{ user: AuthUser }>('/auth/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return data.user;
};

export const refresh = async (): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/auth/refresh');
  return data;
};

export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
};
