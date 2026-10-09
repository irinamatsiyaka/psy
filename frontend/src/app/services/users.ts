import axios from 'axios';
import type { AuthUser, Language } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5012';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

export type UpdateUserProfilePayload = {
  fullName?: string;
  username?: string;
  contactPhone?: string | null;
  about?: string;
  avatarUrl?: string | null;
  preferredLanguage?: Language;
};

export const getUserProfile = async (accessToken: string): Promise<AuthUser> => {
  const { data } = await api.get<AuthUser>('/users/profile', {
    headers: authHeaders(accessToken),
  });
  return data;
};

export const updateUserProfile = async (
  accessToken: string,
  payload: UpdateUserProfilePayload
): Promise<AuthUser> => {
  const { data } = await api.patch<AuthUser>('/users/profile', payload, {
    headers: authHeaders(accessToken),
  });
  return data;
};

export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  const normalized = username.trim().replace(/^@+/, '').toLowerCase();
  const { data } = await api.get<{ available: boolean }>('/users/username-availability', {
    params: { username: normalized },
  });
  return data.available;
};
