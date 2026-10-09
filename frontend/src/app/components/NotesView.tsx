import { useMemo, useState } from 'react';
import { FolderOpen, FileText, Plus, Search, Calendar, Trash2, Pencil } from 'lucide-react';
import type { PsychologistPatient } from '../types/app';
import { useTranslation } from '../hooks/useTranslation';

interface NotesViewProps {
  patients: PsychologistPatient[];
  onCreateNote: (payload: {
    patientId: string;
    body: string;
    noteDate?: string;
    sessionNumber?: number;
    imageUrl?: string | null;
  }) => Promise<void>;
  onUpdateNote: (noteId: string, payload: {
    patientId: string;
    body: string;
    noteDate: string;
    sessionNumber: number;
    imageUrl?: string | null;
  }) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  isSaving: boolean;
}

const toDateInputValue = (noteDateLabel: string): string => {
  const parsed = new Date(noteDateLabel);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
};

export function NotesView({ patients, onCreateNote, onUpdateNote, onDeleteNote, isSaving }: NotesViewProps) {
  const { t } = useTranslation();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedNote, setSelectedNote] = useState<PsychologistPatient['recentNotes'][number] | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftBody, setDraftBody] = useState('');
  const [draftSessionNumber, setDraftSessionNumber] = useState(1);
  const [draftDate, setDraftDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [draftImageUrl, setDraftImageUrl] = useState<string | null>(null);

  const patientFolders = patients.map((patient) => ({
    id: patient.id,
    patientName: patient.name,
    notes: patient.recentNotes
  }));

  const filteredFolders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return patientFolders;
    }
    return patientFolders.filter((folder) => folder.patientName.toLowerCase().includes(q));
  }, [patientFolders, search]);

  const currentFolder = patientFolders.find(f => f.id === selectedFolder);

  const resetDraft = () => {
    setDraftBody('');
    setDraftSessionNumber((currentFolder?.notes.length ?? 0) + 1);
    setDraftDate(new Date().toISOString().slice(0, 10));
    setDraftImageUrl(null);
    setIsEditing(false);
  };

  const startCreate = () => {
    setSelectedNote(null);
    resetDraft();
    setIsEditing(true);
  };

  const startEdit = () => {
    if (!selectedNote) return;
    setDraftBody(selectedNote.text);
    setDraftSessionNumber(selectedNote.sessionNumber);
    setDraftDate(toDateInputValue(selectedNote.date));
    setDraftImageUrl(selectedNote.imageUrl ?? null);
    setIsEditing(true);
  };

  const openNote = (note: PsychologistPatient['recentNotes'][number]) => {
    setSelectedNote(note);
    setIsEditing(false);
  };

  const saveNote = async () => {
    if (!selectedFolder || !draftBody.trim()) return;

    const payload = {
      patientId: selectedFolder,
      body: draftBody,
      sessionNumber: draftSessionNumber,
      noteDate: new Date(`${draftDate}T12:00:00`).toISOString(),
      imageUrl: draftImageUrl,
    };

    if (selectedNote) {
      await onUpdateNote(selectedNote.id, {
        patientId: payload.patientId,
        body: payload.body,
        noteDate: payload.noteDate,
        sessionNumber: payload.sessionNumber,
        imageUrl: payload.imageUrl,
      });
    } else {
      await onCreateNote(payload);
    }

    setIsEditing(false);
    setSelectedNote(null);
    resetDraft();
  };

  const removeNote = async () => {
    if (!selectedNote) return;
    const confirmed = window.confirm(t('notes.confirmDelete'));
    if (!confirmed) return;
    await onDeleteNote(selectedNote.id);
    setSelectedNote(null);
    setIsEditing(false);
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    const result = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Failed to load image'));
      reader.readAsDataURL(file);
    });
    setDraftImageUrl(result);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-background">
      <div className="w-80 border-r border-border bg-card p-6 overflow-auto">
        <div className="mb-6">
          <h3 className="mb-2">{t('notes.patientFolders')}</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('common.search')}
              className="w-full bg-input-background rounded-xl pl-9 pr-3 py-2 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {filteredFolders.length > 0 ? (
          <div className="space-y-2">
            {filteredFolders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => {
                  setSelectedFolder(folder.id);
                  setSelectedNote(null);
                  setIsEditing(false);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                  selectedFolder === folder.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <FolderOpen className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{folder.patientName}</p>
                  <p className={`text-xs ${
                    selectedFolder === folder.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {folder.notes.length} {folder.notes.length === 1 ? t('notes.note') : t('notes.notes')}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-border bg-background/60 p-6 text-center text-sm text-muted-foreground">
            {t('notes.folderEmptyHint')}
          </div>
        )}
      </div>

      <div className="flex-1 flex">
        {selectedFolder ? (
          <>
            <div className="w-80 border-r border-border bg-background p-6 overflow-auto">
              <div className="flex items-center justify-between mb-6">
                <h3>{t('notes.notes')}</h3>
                <button
                  className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center hover:opacity-90"
                  onClick={startCreate}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {currentFolder?.notes.length ? currentFolder.notes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => openNote(note)}
                    className={`w-full p-4 rounded-xl transition-all text-left ${
                      selectedNote?.id === note.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card hover:bg-muted border border-border'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{t('notes.sessionN', { n: note.sessionNumber })}</p>
                        <p className={`text-xs mt-1 ${
                          selectedNote?.id === note.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {note.date}
                        </p>
                      </div>
                    </div>
                    <p className={`text-xs line-clamp-2 ${
                      selectedNote?.id === note.id ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    }`}>
                      {note.text}
                    </p>
                  </button>
                )) : (
                  <div className="rounded-[1.75rem] border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                    {t('notes.patientNoNotes')}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 p-8 overflow-auto">
              {selectedFolder && (selectedNote || isEditing) ? (
                <div className="max-w-4xl mx-auto">
                  <div className="mb-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">{isEditing ? draftDate : selectedNote?.date}</span>
                    </div>
                    <h2>{t('notes.sessionN', { n: isEditing ? draftSessionNumber : selectedNote?.sessionNumber ?? 1 })}</h2>
                    <p className="text-muted-foreground">{currentFolder?.patientName}</p>
                  </div>

                  <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="date"
                            value={draftDate}
                            onChange={(event) => setDraftDate(event.target.value)}
                            className="h-11 rounded-xl border border-border bg-input-background px-3"
                          />
                          <input
                            type="number"
                            min={1}
                            value={draftSessionNumber}
                            onChange={(event) => setDraftSessionNumber(Number(event.target.value) || 1)}
                            className="h-11 rounded-xl border border-border bg-input-background px-3"
                          />
                        </div>

                        <textarea
                          value={draftBody}
                          onChange={(event) => setDraftBody(event.target.value)}
                          className="w-full h-72 bg-transparent resize-none border border-border rounded-xl p-3 focus:outline-none"
                          placeholder={t('notes.notePlaceholder')}
                        />

                        <div className="space-y-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => {
                              void handleImageUpload(event.target.files?.[0] ?? null);
                            }}
                          />
                          {draftImageUrl ? (
                            <img src={draftImageUrl} alt="note" className="max-h-60 rounded-xl border border-border" />
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <textarea
                          value={selectedNote?.text ?? ''}
                          readOnly
                          className="w-full h-72 bg-transparent resize-none focus:outline-none"
                          placeholder={t('notes.notePlaceholder')}
                        />
                        {selectedNote?.imageUrl ? (
                          <img src={selectedNote.imageUrl} alt="note" className="max-h-72 rounded-xl border border-border" />
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex justify-end gap-3">
                    {isEditing ? (
                      <>
                        <button
                          className="px-4 py-2 rounded-xl border border-border"
                          onClick={() => setIsEditing(false)}
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          className="px-6 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
                          onClick={() => {
                            void saveNote();
                          }}
                          disabled={isSaving || !draftBody.trim()}
                        >
                          {t('common.save')}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="px-4 py-2 rounded-xl border border-border flex items-center gap-2"
                          onClick={startEdit}
                        >
                          <Pencil className="w-4 h-4" />
                          {t('common.edit')}
                        </button>
                        <button
                          className="px-4 py-2 rounded-xl border border-border flex items-center gap-2 text-destructive"
                          onClick={() => {
                            void removeNote();
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          {t('common.delete')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>{t('notes.selectNote')}</p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>{t('notes.selectFolder')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
