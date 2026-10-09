import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Send, Paperclip, Video, Phone, Search, MoreVertical, Check, CheckCheck } from 'lucide-react';
import type { PsychologistPatient } from '../types/app';
import { useTranslation } from '../hooks/useTranslation';
import { useChatSearch } from '../hooks/useChatSearch';
import { ChatSearchBar, ChatSearchNav, HighlightedText } from './ChatSearch';

interface PatientChatProps {
  patient: PsychologistPatient;
  onBack: () => void;
  onShowProfile: () => void;
  onStartVideoCall: () => void;
  onStartAudioCall: () => void;
  onSendMessage: (patientId: string, text: string) => Promise<void>;
  onMarkRead: (patientId: string) => Promise<void>;
  isSending: boolean;
}

export function PatientChat({ patient, onBack, onShowProfile, onStartVideoCall, onStartAudioCall, onSendMessage, onMarkRead, isSending }: PatientChatProps) {
  const { t, language } = useTranslation();
  const [inputMessage, setInputMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const search = useChatSearch(patient.messages);
  const closeSearch = search.close;

  useEffect(() => {
    closeSearch();
  }, [patient.id, closeSearch]);
  const locale = language === 'ru' ? 'ru-RU' : 'en-US';

  const formatPresence = (isOnline: boolean, lastSeenAt?: string): string => {
    if (isOnline) {
      return t('chat.online');
    }

    if (!lastSeenAt) {
      return t('chat.offline');
    }

    const lastSeen = new Date(lastSeenAt);
    if (Number.isNaN(lastSeen.getTime())) {
      return t('chat.offline');
    }

    const diffMs = Date.now() - lastSeen.getTime();
    if (diffMs < 0) {
      return t('chat.offline');
    }

    const dayMs = 24 * 60 * 60 * 1000;
    if (diffMs >= dayMs) {
      return t('chat.lastSeenLongAgo');
    }

    const minutes = Math.max(1, Math.floor(diffMs / 60000));
    return `${t('chat.lastSeenPrefix')} ${minutes} ${t('chat.minutesAgo')}`;
  };

  const dateSeparatorFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }),
    [locale]
  );

  const getDateSeparatorLabel = (isoDate: string): string => {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const diffDays = Math.round((today - messageDay) / (24 * 60 * 60 * 1000));

    if (diffDays === 0) return t('chat.today');
    if (diffDays === 1) return t('chat.yesterday');
    return dateSeparatorFormatter.format(date);
  };

  useEffect(() => {
    void onMarkRead(patient.id);
  }, [patient.id]);

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [patient.messages.length, patient.id]);

  const messagesWithSeparators = useMemo(() => {
    return patient.messages.map((message, index) => {
      const previous = index > 0 ? patient.messages[index - 1] : null;
      const currentLabel = getDateSeparatorLabel(message.createdAt);
      const previousLabel = previous ? getDateSeparatorLabel(previous.createdAt) : null;
      return {
        message,
        showDateSeparator: index === 0 || currentLabel !== previousLabel,
        dateLabel: currentLabel,
      };
    });
  }, [patient.messages]);

  const handleSendMessage = async () => {
    if (inputMessage.trim()) {
      await onSendMessage(patient.id, inputMessage);
      setInputMessage('');
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="bg-card border-b border-border px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <button
              onClick={onShowProfile}
              className="flex items-center gap-3 hover:bg-muted rounded-xl px-3 py-2 transition-colors"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                  {patient.name.split(' ').map(n => n[0]).join('')}
                </div>
                {patient.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                )}
              </div>
              <div className="text-left">
                <h4>{patient.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {patient.isOnline ? <span className="text-green-500">● {t('chat.online')}</span> : formatPresence(patient.isOnline, patient.lastSeenAt)}
                </p>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => (search.isOpen ? search.close() : search.open())}
              title={t('chat.search')}
              aria-label={t('chat.search')}
              className={`w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors ${search.isOpen ? 'bg-muted' : ''}`}
            >
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={onStartAudioCall}
              className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            >
              <Phone className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={onStartVideoCall}
              className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            >
              <Video className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
              <MoreVertical className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {search.isOpen && <ChatSearchBar search={search} />}

      <div
        ref={(node) => {
          scrollRef.current = node;
          search.containerRef.current = node;
        }}
        className="flex-1 overflow-y-auto p-6"
      >
        {patient.messages.length > 0 ? (
          <div className="space-y-4">
            {messagesWithSeparators.map(({ message, showDateSeparator, dateLabel }) => (
              <div key={message.id} data-message-id={message.id}>
                {showDateSeparator && dateLabel ? (
                  <div className="mb-3 flex justify-center">
                    <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                      {dateLabel}
                    </span>
                  </div>
                ) : null}

                <div className={`flex ${message.sender === 'doctor' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] ${
                      message.sender === 'doctor'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border text-foreground'
                    } rounded-2xl px-4 py-3`}
                  >
                    <p>
                      <HighlightedText
                        text={message.text}
                        query={search.normalizedQuery}
                        activeOccurrence={search.activeMatch?.messageId === message.id ? search.activeMatch.occurrence : -1}
                      />
                    </p>
                    <div
                      className={`mt-1 flex items-center justify-end gap-1 ${
                        message.sender === 'doctor' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}
                    >
                      <p className="text-xs">{message.time}</p>
                      {message.sender === 'doctor' && (
                        message.isRead
                          ? <CheckCheck className="w-3.5 h-3.5 text-green-400" />
                          : <Check className="w-3.5 h-3.5 opacity-60" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-sm rounded-[2rem] border border-dashed border-border bg-card/60 px-6 py-8 text-center">
              <p className="text-foreground">{t('chat.noMessages')}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('chat.noMessagesHint')}
              </p>
            </div>
          </div>
        )}
      </div>

      {search.isOpen && search.normalizedQuery ? (
        <ChatSearchNav search={search} />
      ) : (
      <div className="border-t border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
            <Paperclip className="w-5 h-5 text-muted-foreground" />
          </button>

          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void handleSendMessage();
              }
            }}
            placeholder={t('chat.typeMessage')}
            className="flex-1 bg-input-background rounded-xl px-4 py-3 border border-border focus:outline-none focus:ring-2 focus:ring-ring"
          />

          <button
            onClick={() => {
              void handleSendMessage();
            }}
            disabled={isSending}
            className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
