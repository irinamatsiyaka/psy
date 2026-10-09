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
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl sm:min-h-[640px]">
        <section className="hidden w-1/2 flex-col justify-between bg-primary p-10 text-primary-foreground md:flex">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] opacity-90">{t('auth.platformTitle')}</p>
            <h1 className="mt-6 text-4xl leading-tight">{t('auth.platformSubtitle')}</h1>
          </div>
          <p className="text-sm opacity-90">
            {t('auth.platformDescription')}
          </p>
        </section>

        <section className="flex w-full min-h-0 flex-col justify-between overflow-y-auto p-6 sm:p-10 md:w-1/2">
          {/* Language Selector (always visible) */}
          <div className="mb-4 flex justify-end gap-2">
            {languageOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  setLanguage(option.id);
                  setPreferredLanguage(option.id);
                }}
                className={`px-3 py-2 rounded-lg text-sm transition-all ${
                  language === option.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {option.flag} {option.id.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Main content area */}
          <div className="flex min-h-0 flex-col flex-1 justify-start py-4">
            
              
                <h2 className="text-2xl">
                  {mode === 'login' ? t('auth.welcomeBack') : t('auth.createAccount')}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {mode === 'login'
                    ? t('auth.signInToContinue')
                    : t('auth.setupProfile')}
                </p>

                <form className="mt-8 space-y-4 overflow-y-auto pr-1" onSubmit={handleSubmit}>
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
                        className="h-11 w-full rounded-xl border border-border bg-input-background px-4"
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
                      <div className="flex gap-2">
                        <input
                          id="username"
                          type="text"
                          value={username}
                          onChange={(event) => setUsername(event.target.value)}
                          className="h-11 w-full rounded-xl border border-border bg-input-background px-4"
                          placeholder="@alexrivera"
                          autoComplete="username"
                          required
                        />
                        <button
                          type="button"
                          onClick={generateRandomUsername}
                          className="h-11 shrink-0 rounded-xl border border-border px-3 text-sm hover:bg-muted"
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
                              className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${
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
                      className="h-11 w-full rounded-xl border border-border bg-input-background px-4"
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
                      className="h-11 w-full rounded-xl border border-border bg-input-background px-4"
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
                        className="h-11 w-full rounded-xl border border-border bg-input-background px-4"
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
                    className="h-11 w-full rounded-xl bg-primary px-4 text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? t('auth.pleaseWait') : mode === 'login' ? t('auth.signIn') : t('auth.signUp')}
                  </button>
                </form>

                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setMode((current) => (current === 'login' ? 'register' : 'login'));
                      setError('');
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    {mode === 'login' ? t('auth.needAccount') : t('auth.haveAccount')}
                  </button>
                  <span className="text-muted-foreground">•</span>
                  <button
                    type="button"
                    onClick={() => setMode('language')}
                    className="text-sm text-primary hover:underline"
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
