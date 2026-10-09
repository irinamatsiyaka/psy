import { FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { LogOut, Monitor, Smartphone, Upload, X, Palette, Languages, ChevronRight } from 'lucide-react';
import type { AuthUser } from '../types/auth';
import { useTranslation } from '../hooks/useTranslation';
import type { Language } from '../types/auth';
import { checkUsernameAvailability } from '../services/users';

type UserProfileModalProps = {
  isOpen: boolean;
  user: AuthUser;
  canSwitchViews: boolean;
  viewMode: 'desktop' | 'mobile';
  language: Language;
  onClose: () => void;
  onViewModeChange: (mode: 'desktop' | 'mobile') => void;
  onToggleLanguage: () => Promise<void>;
  onLogout: () => Promise<void>;
  onSave: (payload: {
    fullName: string;
    username: string;
    contactPhone: string | null;
    about: string;
    avatarUrl: string | null;
  }) => Promise<void>;
  isSaving: boolean;
};

export function UserProfileModal({
  isOpen,
  user,
  canSwitchViews,
  viewMode,
  language,
  onClose,
  onViewModeChange,
  onToggleLanguage,
  onLogout,
  onSave,
  isSaving,
}: UserProfileModalProps) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState(user.fullName);
  const [username, setUsername] = useState(user.username ?? '');
  const [contactPhone, setContactPhone] = useState(user.contactPhone ?? '');
  const [about, setAbout] = useState(user.about ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? '');
  const [error, setError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);

  const normalizedUsername = useMemo(() => username.trim().replace(/^@/, '').toLowerCase(), [username]);

  useEffect(() => {
    setFullName(user.fullName);
    setUsername(user.username ?? '');
    setContactPhone(user.contactPhone ?? '');
    setAbout(user.about ?? '');
    setAvatarUrl(user.avatarUrl ?? '');
    setError('');
    setIsUsernameAvailable(true);
  }, [user]);

  useEffect(() => {
    if (!isOpen) return;
    if (!/^[a-z0-9_]{5,32}$/.test(normalizedUsername)) {
      setIsUsernameAvailable(null);
      return;
    }

    if (normalizedUsername === (user.username ?? '').toLowerCase()) {
      setIsUsernameAvailable(true);
      return;
    }

    let cancelled = false;
    setIsCheckingUsername(true);
    const timer = window.setTimeout(() => {
      void checkUsernameAvailability(normalizedUsername)
        .then((available) => {
          if (!cancelled) setIsUsernameAvailable(available);
        })
        .catch(() => {
          if (!cancelled) setIsUsernameAvailable(null);
        })
        .finally(() => {
          if (!cancelled) setIsCheckingUsername(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, normalizedUsername, user.username]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const normalizedUsername = username.trim().replace(/^@/, '').toLowerCase();
    if (!/^[a-z0-9_]{5,32}$/.test(normalizedUsername)) {
      setError(t('profile.usernameValidation'));
      return;
    }

    if (isUsernameAvailable === false) {
      setError(t('auth.usernameTaken'));
      return;
    }

    try {
      await onSave({
        fullName: fullName.trim(),
        username: normalizedUsername,
        contactPhone: contactPhone.trim() || null,
        about: about.trim(),
        avatarUrl: avatarUrl.trim() || null,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          setError(t('auth.usernameTaken'));
          return;
        }
        if (error.response?.status === 413) {
          setError(t('profile.avatarTooLarge'));
          return;
        }
        const backendMessage = String(error.response?.data?.message ?? '').toLowerCase();
        if (backendMessage.includes('username')) {
          setError(t('auth.usernameTaken'));
          return;
        }
      }
      setError(t('profile.saveFailed'));
    }
  };

  const compressImage = async (file: File): Promise<string> => {
    const fileDataUrl = await new Promise<string>((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onload = () => resolve(String(fileReader.result ?? ''));
      fileReader.onerror = () => reject(new Error('Failed to read avatar file'));
      fileReader.readAsDataURL(file);
    });

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load avatar image'));
      img.src = fileDataUrl;
    });

    const maxSide = 720;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas is not supported');
    }

    context.drawImage(image, 0, 0, width, height);

    let quality = 0.88;
    let compressed = canvas.toDataURL('image/jpeg', quality);
    const maxDataUrlLength = 1_850_000;
    while (compressed.length > maxDataUrlLength && quality > 0.45) {
      quality -= 0.08;
      compressed = canvas.toDataURL('image/jpeg', quality);
    }

    return compressed;
  };

  const handleAvatarUpload = async (file: File | null) => {
    if (!file) {
      return;
    }

    try {
      const dataUrl = await compressImage(file);
      setAvatarUrl(dataUrl);
      setError('');
    } catch {
      setError(t('profile.avatarProcessFailed'));
    }
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#efeff4] p-4 sm:p-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-4 flex items-center justify-between px-1">
          <h3 className="text-2xl font-semibold text-[#101828]">{t('profile.title')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white p-2 text-[#344054] shadow-sm transition-colors hover:bg-[#f8f9fc]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="h-24 w-24 overflow-hidden rounded-full bg-[#8ec3b2] ring-4 ring-[#eff7f4]">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={user.fullName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl text-white">
                    {fullName.split(' ').map((namePart) => namePart[0]).join('')}
                  </div>
                )}
              </div>
              <h4 className="mt-3 text-xl text-[#101828]">{fullName || user.fullName}</h4>
              <p className="mt-1 text-sm text-[#667085]">{username ? `@${normalizedUsername}` : t('auth.usernameHint')}</p>

              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#f5f7fb] px-4 py-2 text-sm text-[#1570ef] hover:bg-[#eaf1ff]">
                <Upload className="h-4 w-4" />
                {t('profile.uploadPhoto')}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    void handleAvatarUpload(event.target.files?.[0] ?? null);
                  }}
                />
              </label>
            </div>
          </div>

          <div className="rounded-[28px] bg-white p-3 shadow-sm">
            <div className="divide-y divide-[#eef1f6] overflow-hidden rounded-2xl border border-[#eef1f6]">
              <label className="flex items-center justify-between gap-4 bg-white px-4 py-3">
                <span className="text-sm text-[#667085]">{t('auth.fullName')}</span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="w-[70%] border-none bg-transparent text-right text-[#101828] focus:outline-none"
                  required
                />
              </label>

              <label className="flex items-center justify-between gap-4 bg-white px-4 py-3">
                <span className="text-sm text-[#667085]">{t('profile.username')}</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-[70%] border-none bg-transparent text-right text-[#101828] focus:outline-none"
                  placeholder="@alexrivera"
                  required
                />
              </label>

              <label className="flex items-center justify-between gap-4 bg-white px-4 py-3">
                <span className="text-sm text-[#667085]">{t('profile.phone')}</span>
                <input
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                  className="w-[70%] border-none bg-transparent text-right text-[#101828] focus:outline-none"
                  placeholder={t('profile.phonePlaceholder')}
                />
              </label>
            </div>

            <p className={`mt-2 px-1 text-xs ${isUsernameAvailable === false ? 'text-destructive' : 'text-[#667085]'}`}>
              {isCheckingUsername
                ? t('auth.checkingUsername')
                : isUsernameAvailable === false
                ? t('auth.usernameTaken')
                : isUsernameAvailable === true
                ? t('auth.usernameAvailable')
                : t('auth.usernameHint')}
            </p>
          </div>

          <div className="rounded-[28px] bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs uppercase tracking-wide text-[#98a2b3]">{t('profile.about')}</p>
            <textarea
              value={about}
              onChange={(event) => setAbout(event.target.value)}
              className="min-h-24 w-full rounded-2xl border border-[#eef1f6] bg-[#fcfcfd] px-4 py-3 text-[#101828] focus:outline-none"
              placeholder={t('profile.aboutPlaceholder')}
              maxLength={300}
            />
          </div>

          <div className="rounded-[28px] bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs uppercase tracking-wide text-[#98a2b3]">{t('profile.accountControls')}</p>
            <div className="mb-3 divide-y divide-[#eef1f6] overflow-hidden rounded-2xl border border-[#eef1f6]">
              <button
                type="button"
                className="flex w-full items-center justify-between bg-white px-4 py-3 text-left hover:bg-[#f8fafc]"
              >
                <span className="inline-flex items-center gap-2 text-sm text-[#101828]">
                  <Palette className="h-4 w-4 text-[#1570ef]" />
                  {t('profile.appearance')}
                </span>
                <ChevronRight className="h-4 w-4 text-[#98a2b3]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  void onToggleLanguage();
                }}
                className="flex w-full items-center justify-between bg-white px-4 py-3 text-left hover:bg-[#f8fafc]"
              >
                <span className="inline-flex items-center gap-2 text-sm text-[#101828]">
                  <Languages className="h-4 w-4 text-[#1570ef]" />
                  {t('profile.language')}
                </span>
                <span className="inline-flex items-center gap-2 text-sm text-[#667085]">
                  {language === 'en' ? 'English' : 'Русский'}
                  <ChevronRight className="h-4 w-4 text-[#98a2b3]" />
                </span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {canSwitchViews ? (
                <>
                  <button
                    type="button"
                    onClick={() => onViewModeChange('desktop')}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${
                      viewMode === 'desktop' ? 'bg-[#1570ef] text-white' : 'bg-[#f5f7fb] text-[#344054] hover:bg-[#e9eef8]'
                    }`}
                  >
                    <Monitor className="h-4 w-4" />
                    {t('role.psychologist')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewModeChange('mobile')}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${
                      viewMode === 'mobile' ? 'bg-[#1570ef] text-white' : 'bg-[#f5f7fb] text-[#344054] hover:bg-[#e9eef8]'
                    }`}
                  >
                    <Smartphone className="h-4 w-4" />
                    {t('role.patient')}
                  </button>
                </>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  void onLogout();
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#fff1f3] px-4 py-2 text-sm text-[#c01048] hover:bg-[#ffe4ea]"
              >
                <LogOut className="h-4 w-4" />
                {t('common.logout')}
              </button>
            </div>
          </div>

          {error ? <p className="px-1 text-sm text-destructive">{error}</p> : null}

          <button
            type="submit"
            disabled={isSaving}
            className="h-12 w-full rounded-2xl bg-[#1570ef] text-white transition-opacity hover:opacity-90 disabled:opacity-70"
          >
            {isSaving ? t('profile.saving') : t('profile.save')}
          </button>
        </form>
      </div>
    </div>
  );
}
