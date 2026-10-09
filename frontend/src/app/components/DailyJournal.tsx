import { useMemo, useState } from 'react';
import { Send, MessageCircle, FileText, Pencil, Trash2, Plus, Search } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

interface DailyJournalProps {
  journalEntries: Array<{ id: string; createdAt: string; body: string }>;
  checkInMessages: Array<{ id: string; type: 'bot' | 'user'; text: string }>;
  onSaveEntry: (body: string) => Promise<void>;
  onUpdateEntry: (journalEntryId: string, body: string) => Promise<void>;
  onDeleteEntry: (journalEntryId: string) => Promise<void>;
  onSendCheckIn: (body: string) => Promise<void>;
  isSaving: boolean;
}

export function DailyJournal({
  journalEntries,
  checkInMessages,
  onSaveEntry,
  onUpdateEntry,
  onDeleteEntry,
  onSendCheckIn,
  isSaving,
}: DailyJournalProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(journalEntries[0]?.id ?? null);
  const [journalEntry, setJournalEntry] = useState('');
  const [isEditingEntry, setIsEditingEntry] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return journalEntries;
    }
    return journalEntries.filter((entry) => entry.body.toLowerCase().includes(q));
  }, [journalEntries, search]);

  const selectedEntry = journalEntries.find((entry) => entry.id === selectedEntryId) ?? null;

  const handleSendMessage = async () => {
    if (chatInput.trim()) {
      await onSendCheckIn(chatInput);
      setChatInput('');
    }
  };

  const handleSaveEntry = async () => {
    if (!journalEntry.trim()) {
      return;
    }

    if (selectedEntry && isEditingEntry) {
      await onUpdateEntry(selectedEntry.id, journalEntry);
    } else {
      await onSaveEntry(journalEntry);
    }

    setJournalEntry('');
    setIsEditingEntry(false);
  };

  const startCreate = () => {
    setSelectedEntryId(null);
    setJournalEntry('');
    setIsEditingEntry(true);
  };

  const startEdit = () => {
    if (!selectedEntry) return;
    setJournalEntry(selectedEntry.body);
    setIsEditingEntry(true);
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;
    const confirmed = window.confirm(t('journal.confirmDelete'));
    if (!confirmed) return;
    await onDeleteEntry(selectedEntry.id);
    setSelectedEntryId(null);
    setIsEditingEntry(false);
    setJournalEntry('');
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        <div className="rounded-3xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3>{t('journal.title')}</h3>
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('common.search')}
              className="h-10 w-full rounded-xl border border-border bg-input-background pl-9 pr-3"
            />
          </div>

          <div className="max-h-[440px] space-y-2 overflow-y-auto pr-1">
            {filteredEntries.length > 0 ? filteredEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  setSelectedEntryId(entry.id);
                  setIsEditingEntry(false);
                  setJournalEntry('');
                }}
                className={`w-full rounded-2xl border p-3 text-left transition-all ${
                  selectedEntryId === entry.id && !isEditingEntry
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/40'
                }`}
              >
                <p className="text-xs text-muted-foreground">{entry.createdAt}</p>
                <p className="mt-1 line-clamp-3 text-sm">{entry.body}</p>
              </button>
            )) : (
              <div className="rounded-2xl border border-dashed border-border bg-background/60 p-4 text-sm text-muted-foreground">
                {t('journal.emptyHint')}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3>{isEditingEntry ? t('common.edit') : t('journal.title')}</h3>
              <p className="text-xs text-muted-foreground">{selectedEntry?.createdAt ?? t('patient.today')}</p>
            </div>
            {!isEditingEntry && selectedEntry ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={startEdit}
                  className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  <Pencil className="h-4 w-4" />
                  {t('common.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleDelete();
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-sm text-destructive hover:bg-muted"
                >
                  <Trash2 className="h-4 w-4" />
                  {t('common.delete')}
                </button>
              </div>
            ) : null}
          </div>

          {isEditingEntry ? (
            <>
              <textarea
                value={journalEntry}
                onChange={(event) => setJournalEntry(event.target.value)}
                placeholder={t('journal.placeholder')}
                className="h-64 w-full resize-none rounded-2xl border border-border bg-input-background p-4"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted"
                  onClick={() => {
                    setIsEditingEntry(false);
                    setJournalEntry('');
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  disabled={isSaving || !journalEntry.trim()}
                  onClick={() => {
                    void handleSaveEntry();
                  }}
                  className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {t('journal.saveEntry')}
                </button>
              </div>
            </>
          ) : selectedEntry ? (
            <div className="rounded-2xl bg-muted/30 p-4">
              <p className="whitespace-pre-wrap text-sm">{selectedEntry.body}</p>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border bg-background/60 text-sm text-muted-foreground">
              <div className="text-center">
                <FileText className="mx-auto mb-2 h-8 w-8 opacity-30" />
                <p>{t('notes.selectNote')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h3>{t('journal.stateAssessment')}</h3>
        </div>

        <div className="h-64 overflow-y-auto mb-4 space-y-3">
          {checkInMessages.length > 0 ? checkInMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  msg.type === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <p className="text-sm">{msg.text}</p>
              </div>
            </div>
          )) : (
            <div className="rounded-[1.75rem] border border-dashed border-border bg-background/60 p-5 text-sm text-muted-foreground">
              {t('journal.checkInEmptyHint')}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void handleSendMessage();
              }
            }}
            placeholder={t('journal.typeResponse')}
            className="flex-1 bg-input-background rounded-2xl px-4 py-3 border border-border focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => {
              void handleSendMessage();
            }}
            disabled={isSaving}
            className="w-12 h-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
