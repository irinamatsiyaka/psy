import { FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { login, register } from '../services/auth';
import { useTranslation } from '../hooks/useTranslation';
import type { AuthResponse, UserRole, Language } from '../types/auth';
import { checkUsernameAvailability } from '../services/users';

type AuthScreenProps = {
  onAuthenticated: (payload: AuthResponse) => void;
};

type Mode = 'login' | 'register' | 'language';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const { t, language, setLanguage } = useTranslation();

  const [mode, setMode] = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [roles, setRoles] = useState<UserRole[]>(['patient']);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<Language>('ru');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);

  const languageOptions: Array<{ id: Language; title: string; flag: string }> = [
    { id: 'en', title: 'English', flag: '🇬🇧' },
    { id: 'ru', title: 'Русский', flag: '🇷🇺' }
  ];

  const roleOptions: Array<{ id: UserRole; title: string; description: string }> = [
    {
      id: 'patient',
      title: t('role.patient'),
      description: t('role.patientDesc')
    },
    {
      id: 'psychologist',
      title: t('role.psychologist'),
      description: t('role.psychologistDesc')
    }
  ];

  const normalizedUsername = useMemo(() => username.trim().replace(/^@+/, '').toLowerCase(), [username]);

  const generateRandomUsername = () => {
    const base = fullName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 20) || 'user';
    const suffix = String(Math.floor(Math.random() * 10_000)).padStart(4, '0');
    setUsername(`@${base}${suffix}`);
  };

  useEffect(() => {
    if (mode !== 'register') {
      return;
    }

    if (!/^[a-z0-9_]{5,32}$/.test(normalizedUsername)) {
      setIsUsernameAvailable(null);
      return;
    }

    let cancelled = false;
    setIsCheckingUsername(true);

    const timer = window.setTimeout(() => {
      void checkUsernameAvailability(normalizedUsername)
        .then((available) => {
          if (!cancelled) {
            setIsUsernameAvailable(available);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setIsUsernameAvailable(null);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsCheckingUsername(false);
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mode, normalizedUsername]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!emailPattern.test(email.trim().toLowerCase())) {
      setError(t('auth.invalidEmail'));
      return;
    }

    if (password.length < 8) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    if (mode === 'register') {
      if (fullName.trim().length < 2) {
        setError(t('auth.fullNameRequired'));
        return;
      }

      if (password !== confirmPassword) {
        setError(t('auth.passwordMismatch'));
        return;
      }

      if (roles.length === 0) {
        setError(t('auth.selectRole'));
        return;
      }

      if (!/^[a-z0-9_]{5,32}$/.test(normalizedUsername)) {
        setError(t('profile.usernameValidation'));
        return;
      }

      if (isUsernameAvailable === false) {
        setError(t('auth.usernameTaken'));
        return;
      }
    }

    setLoading(true);

    try {
      const payload =
        mode === 'login'
          ? await login({ email: email.trim().toLowerCase(), password })
          : await register({
              fullName: fullName.trim(),
              username: normalizedUsername,
              roles,
              email: email.trim().toLowerCase(),
              password,
              preferredLanguage,
            });

      onAuthenticated(payload);
    } catch (requestError: unknown) {
      if (axios.isAxiosError(requestError)) {
        const data = requestError.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
        const message = data?.message;
        const status = requestError.response?.status;

        if (message === 'User not found') {
          setError(t('auth.userNotFound'));
        } else if (message === 'Invalid password') {
          setError(t('auth.invalidPassword'));
        } else if (message === 'Username is already taken') {
          setError(t('auth.usernameTaken'));
        } else if (message === 'User already exists' || status === 409) {
          setError(t('auth.userAlreadyExists'));
        } else if (message === 'Invalid payload' && data?.errors) {
          // Flatten all field errors into a readable list
          const fieldLabels: Record<string, string> = {
            email: t('auth.email'),
            password: t('auth.password'),
            fullName: t('auth.fullName'),
            username: t('profile.username'),
            roles: t('auth.chooseWorkspace'),
          };
          const lines: string[] = [];
          for (const [field, msgs] of Object.entries(data.errors)) {
            const label = fieldLabels[field] ?? field;
            lines.push(`${label}: ${msgs.join(', ')}`);
          }
          setError(`${t('auth.validationError')}\n${lines.join('\n')}`);
        } else if (typeof message === 'string') {
          setError(message);
        } else {
          setError(t('auth.authFailed'));
        }
      } else {
        setError(t('auth.unexpectedError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background p-3 sm:p-5 lg:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1200px] flex-col overflow-hidden rounded-[28px] border border-border bg-card shadow-2xl sm:min-h-[640px] md:flex-row">
        <section className="flex w-full flex-col justify-between bg-primary p-5 text-primary-foreground md:w-1/2 md:p-8 lg:p-10">
          <div className="mb-6 md:mb-0">
            <p className="text-[11px] uppercase tracking-[0.22em] opacity-90 md:text-sm">{t('auth.platformTitle')}</p>
            <h1 className="mt-4 max-w-[540px] text-[clamp(2rem,5vw,3.4rem)] leading-[0.98] md:mt-6">
              {t('auth.platformSubtitle')}
            </h1>
          </div>

          <p className="mt-6 max-w-[420px] text-sm opacity-90 md:mt-0 md:text-base">
            {t('auth.platformDescription')}
          </p>
        </section>

        <section className="flex w-full flex-col justify-between p-4 sm:p-5 md:w-1/2 md:p-6 lg:p-9">
          <div className="mb-4 flex flex-wrap items-center justify-end gap-2 self-end">
            {languageOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  setLanguage(option.id);
                  setPreferredLanguage(option.id);
                }}
                className={`rounded-full px-3 py-2 text-sm transition-all ${
                  language === option.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {option.flag} {option.id.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-start py-2 sm:py-4">
            <div className="mb-4 md:mb-6">
              <h2 className="text-[clamp(1.8rem,4vw,2.6rem)] leading-tight text-foreground">
                {mode === 'login' ? t('auth.welcomeBack') : t('auth.createAccount')}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === 'login'
                  ? t('auth.signInToContinue')
                  : t('auth.setupProfile')}
              </p>
            </div>

            <form className="w-full space-y-4" onSubmit={handleSubmit}>
              {mode === 'register' && (
                <div>
                  <label className="mb-2 block text-sm text-foreground" htmlFor="fullName">
                    {t('auth.fullName')}
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="h-12 w-full rounded-xl border border-border bg-input-background px-4 text-base"
                    placeholder={t('auth.fullNamePlaceholder')}
                    autoComplete="name"
                    required
                  />
                </div>
              )}

              {mode === 'register' && (
                <div>
                  <label className="mb-2 block text-sm text-foreground" htmlFor="username">
                    {t('profile.username')}
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className="h-12 w-full rounded-xl border border-border bg-input-background px-4 text-base"
                      placeholder="@alexrivera"
                      autoComplete="username"
                      required
                    />
                    <button
                      type="button"
                      onClick={generateRandomUsername}
                      className="h-12 shrink-0 rounded-xl border border-border px-3 text-sm hover:bg-muted"
                    >
                      {t('auth.generateUsername')}
                    </button>
                  </div>
                  <p className={`mt-2 text-xs ${isUsernameAvailable === false ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {isCheckingUsername
                      ? t('auth.checkingUsername')
                      : isUsernameAvailable === false
                        ? t('auth.usernameTaken')
                        : isUsernameAvailable === true
                          ? t('auth.usernameAvailable')
                          : t('auth.usernameHint')}
                  </p>
                </div>
              )}

              {mode === 'register' && (
                <div>
                  <label className="mb-2 block text-sm text-foreground">
                    {t('auth.chooseWorkspace')}
                  </label>
                  <div className="space-y-3">
                    {roleOptions.map((option) => {
                      const isSelected = roles.includes(option.id);

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setRoles((current) =>
                              current.includes(option.id)
                                ? current.filter((roleItem) => roleItem !== option.id)
                                : [...current, option.id]
                            );
                          }}
                          className={`w-full rounded-2xl border px-4 py-3 text-left transition-all sm:py-4 ${
                            isSelected
                              ? 'border-primary bg-primary/10 shadow-sm'
                              : 'border-border bg-background hover:border-primary/40 hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm text-foreground">{option.title}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                            </div>
                            <div className={`mt-1 h-5 w-5 rounded-full border ${isSelected ? 'border-primary bg-primary' : 'border-border'}`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t('auth.selectBoth')}
                  </p>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-foreground" htmlFor="email">
                  {t('auth.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-input-background px-4 text-base"
                  placeholder={t('auth.emailPlaceholder')}
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-foreground" htmlFor="password">
                  {t('auth.password')}
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-input-background px-4 text-base"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                />
              </div>

              {mode === 'register' && (
                <div>
                  <label className="mb-2 block text-sm text-foreground" htmlFor="confirmPassword">
                    {t('auth.confirmPassword')}
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-12 w-full rounded-xl border border-border bg-input-background px-4 text-base"
                    autoComplete="new-password"
                    required
                  />
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error.split('\n').map((line, index) => (
                    <p key={index} className={index > 0 ? 'mt-1' : ''}>{line}</p>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-primary px-4 text-base text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? t('auth.pleaseWait') : mode === 'login' ? t('auth.signIn') : t('auth.signUp')}
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => {
                  setMode((current) => (current === 'login' ? 'register' : 'login'));
                  setError('');
                }}
                className="text-primary hover:underline"
              >
                {mode === 'login' ? t('auth.needAccount') : t('auth.haveAccount')}
              </button>
              <span className="text-muted-foreground">•</span>
              <button
                type="button"
                onClick={() => setMode('language')}
                className="text-primary hover:underline"
              >
                {t('auth.changeLanguage')}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
