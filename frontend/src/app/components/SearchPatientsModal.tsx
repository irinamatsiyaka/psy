import { useState } from 'react';
import { X, Search, MessageCircle } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import type { SearchUser } from '../services/app';

type SearchPatientsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient: (patient: SearchUser) => void;
  onAttachPatient: (patientId: number) => Promise<void>;
  onSearch: (query: string) => Promise<SearchUser[]>;
  isLoading: boolean;
};

export function SearchPatientsModal({
  isOpen,
  onClose,
  onSelectPatient,
  onAttachPatient,
  onSearch,
  isLoading
}: SearchPatientsModalProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await onSearch(query);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-6">
          <h2 className="text-xl font-semibold text-foreground">
            {t('dashboard.searchPatients')}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-input-background pl-10 pr-4 placeholder:text-muted-foreground"
              autoFocus
            />
          </div>

          <div className="max-h-96 space-y-2 overflow-y-auto">
            {isSearching && (
              <p className="text-center text-sm text-muted-foreground py-4">
                {t('common.loading')}
              </p>
            )}

            {!isSearching && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                {t('common.noResults')}
              </p>
            )}

            {!isSearching && searchQuery.trim().length < 2 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                {t('dashboard.searchHint')}
              </p>
            )}

            {!isSearching && searchResults.map((patient) => (
              <div
                key={patient.id}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-left transition-all hover:border-primary/40 hover:bg-muted/50 disabled:opacity-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!patient.isInPatientList) {
                        return;
                      }
                      onSelectPatient(patient);
                      setSearchQuery('');
                      setSearchResults([]);
                      onClose();
                    }}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm font-medium text-foreground">{patient.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {patient.username ? `@${patient.username}` : patient.email}
                    </p>
                  </button>
                  <div className="flex items-center gap-2">
                    {patient.isInPatientList ? (
                      <span className="text-xs text-muted-foreground">
                        {t('dashboard.alreadyInList')}
                      </span>
                    ) : patient.hasPsychologist ? (
                      <span className="text-xs text-muted-foreground">
                        {t('dashboard.patientHasPsychologist')}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          await onAttachPatient(patient.id);
                          setSearchQuery('');
                          setSearchResults([]);
                          onClose();
                        }}
                        disabled={isLoading}
                        className="rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                      >
                        {t('dashboard.addToList')}
                      </button>
                    )}
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
