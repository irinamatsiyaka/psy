export type UserRole = "psychologist" | "patient";
export type Language = "en" | "ru";

export type AuthUser = {
  id: number;
  email: string;
  fullName: string;
  roles: UserRole[];
  preferredLanguage: string;
  username: string | null;
  contactPhone: string | null;
  about: string;
  avatarUrl: string | null;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};
