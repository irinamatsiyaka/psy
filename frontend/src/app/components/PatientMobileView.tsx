import { useEffect, useMemo, useRef, useState } from 'react';
import { Home, Calendar, BookOpen, CheckCircle2, MessageCircle, Send, ArrowLeft, Search, Phone, Video, MoreVertical, Check, CheckCheck } from 'lucide-react';
import { MoodCalendar } from './MoodCalendar';
import { DailyJournal } from './DailyJournal';
import { BookingScreen } from './BookingScreen';
import { CallOverlay } from './CallOverlay';
import type { MoodType, PatientMobileData } from '../types/app';
import { useTranslation } from '../hooks/useTranslation';
import { useChatSearch } from '../hooks/useChatSearch';
import { ChatSearchBar, ChatSearchNav, HighlightedText } from './ChatSearch';

interface PatientMobileViewProps {
  data: PatientMobileData | null;
  onSaveMood: (mood: MoodType, entryDate?: string) => Promise<void>;
  onSaveJournalEntry: (body: string) => Promise<void>;
  onUpdateJournalEntry: (journalEntryId: string, body: string) => Promise<void>;
  onDeleteJournalEntry: (journalEntryId: string) => Promise<void>;
  onSendCheckIn: (body: string) => Promise<void>;
  onBookAppointment: (appointmentId: string) => Promise<void>;
  onConfirmAppointment: (appointmentId: string) => Promise<void>;
  onSendMessageToTherapist: (therapistId: string, conversationId: string | null, text: string) => Promise<void>;
  onMarkThreadRead: (therapistId: string) => Promise<void>;
  isMutating: boolean;
}

export function PatientMobileView({
  data,
  onSaveMood,
  onSaveJournalEntry,
  onUpdateJournalEntry,
  onDeleteJournalEntry,
  onSendCheckIn,
  onBookAppointment,
  onConfirmAppointment,
  onSendMessageToTherapist,
  onMarkThreadRead,
  isMutating,
}: PatientMobileViewProps) {
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [callState, setCallState] = useState<{ kind: 'audio' | 'video'; therapistName: string } | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const profile = data?.profile;
  const pendingAppointments = data?.pendingAppointments ?? [];
  const myAppointments = data?.myAppointments ?? [];
  const chatThreads = data?.chatThreads ?? [];
  const locale = language === 'ru' ? 'ru-RU' : 'en-US';

  const sortedThreads = useMemo(
    () => [...chatThreads].sort((a, b) => {
      const left = a.lastMessageAt ? Date.parse(a.lastMessageAt) : Number.NEGATIVE_INFINITY;
      const right = b.lastMessageAt ? Date.parse(b.lastMessageAt) : Number.NEGATIVE_INFINITY;
      return right - left;
    }),
    [chatThreads]
  );

  const selectedThread = sortedThreads.find((thread) => thread.therapistId === selectedThreadId) ?? sortedThreads[0] ?? null;
  const selectedThreadSlots = (data?.availableSlots ?? []).filter(
    (slot) => selectedThread && slot.therapistName === selectedThread.therapistName
  );
  const search = useChatSearch(selectedThread?.messages ?? []);
  const closeSearch = search.close;

  useEffect(() => {
    closeSearch();
  }, [selectedThread?.therapistId, closeSearch]);
  const now = new Date();
  const calendarYear = now.getFullYear();
  const calendarMonth = now.getMonth();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstWeekday = new Date(calendarYear, calendarMonth, 1).getDay();

  const appointmentDots = useMemo(() => {
    const map = new Map<number, number>();
    for (const appointment of myAppointments) {
      const date = new Date(appointment.startsAt);
      const day = date.getDate();
      if (!Number.isNaN(day)) {
        map.set(day, (map.get(day) ?? 0) + 1);
      }
    }
    for (const appointment of pendingAppointments) {
      const date = new Date(appointment.startsAt);
      const day = date.getDate();
      if (!Number.isNaN(day)) {
        map.set(day, (map.get(day) ?? 0) + 1);
      }
    }
    return map;
  }, [myAppointments, pendingAppointments, calendarYear]);

  const dateSeparatorFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }),
    [locale]
  );

  const formatPresence = (isOnline: boolean, lastSeenAt?: string): string => {
    if (isOnline) return t('chat.online');
    if (!lastSeenAt) return t('chat.offline');

    const date = new Date(lastSeenAt);
    if (Number.isNaN(date.getTime())) return t('chat.offline');

    const diffMs = Date.now() - date.getTime();
    if (diffMs < 0) return t('chat.offline');
    if (diffMs >= 24 * 60 * 60 * 1000) return t('chat.lastSeenLongAgo');

    const minutes = Math.max(1, Math.floor(diffMs / 60000));
    return `${t('chat.lastSeenPrefix')} ${minutes} ${t('chat.minutesAgo')}`;
  };

  const getDateSeparatorLabel = (isoDate: string): string => {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return '';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const diffDays = Math.round((today - messageDay) / (24 * 60 * 60 * 1000));

    if (diffDays === 0) return t('chat.today');
    if (diffDays === 1) return t('chat.yesterday');
    return dateSeparatorFormatter.format(date);
  };

  const messagesWithSeparators = useMemo(() => {
    if (!selectedThread) return [];
    return selectedThread.messages.map((message, index) => {
      const previous = index > 0 ? selectedThread.messages[index - 1] : null;
      const currentLabel = getDateSeparatorLabel(message.createdAt);
      const previousLabel = previous ? getDateSeparatorLabel(previous.createdAt) : null;
      return {
        message,
        showDateSeparator: index === 0 || currentLabel !== previousLabel,
        dateLabel: currentLabel,
      };
    });
  }, [selectedThread, language]);

  useEffect(() => {
    if (!selectedThread) return;
    void onMarkThreadRead(selectedThread.therapistId);
  }, [selectedThread?.therapistId]);

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [selectedThread?.therapistId, selectedThread?.messages.length]);

  const tabs = [
    { id: 'home', icon: Home, label: t('nav.home') },
    { id: 'journal', icon: BookOpen, label: t('patient.journal') },
    { id: 'chat', icon: MessageCircle, label: t('dashboard.chat') },
    { id: 'booking', icon: Calendar, label: t('nav.book') },
  ] as const;

  const handleStartCall = (kind: 'audio' | 'video') => {
    if (!selectedThread) return;
    setCallState({ kind, therapistName: selectedThread.therapistName });
  };

  return (
    <div className="min-h-screen w-full bg-background">
      {callState && (
        <CallOverlay
          therapistName={callState.therapistName}
          kind={callState.kind}
          onEnd={() => setCallState(null)}
        />
      )}
      <div className="w-full px-0 py-0">
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-primary">MindCare</h2>
          <p className="text-sm text-muted-foreground">
            {profile?.therapistName
              ? t('patient.connectedTo', { therapist: profile.therapistName })
              : t('patient.companion')}
          </p>
        </div>

        <div className="mt-3 hidden rounded-none border-y border-border bg-card p-2 md:flex md:gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 transition-all ${
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className={`mt-3 px-3 md:px-4 lg:px-6 ${activeTab === 'chat' ? 'h-[calc(100vh-170px)] overflow-hidden pb-24 md:pb-0' : 'pb-24 md:pb-0'}`}>
          {activeTab === 'home' && (
            <MoodCalendar
              moodDays={data?.moods ?? []}
              onSaveMood={onSaveMood}
              isSaving={isMutating}
            />
          )}
          {activeTab === 'journal' && (
            <DailyJournal
              journalEntries={data?.journalEntries ?? []}
              checkInMessages={data?.checkInMessages ?? []}
              onSaveEntry={onSaveJournalEntry}
              onUpdateEntry={onUpdateJournalEntry}
              onDeleteEntry={onDeleteJournalEntry}
              onSendCheckIn={onSendCheckIn}
              isSaving={isMutating}
            />
          )}
          {activeTab === 'booking' && (
            <div className="space-y-4">
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <h3 className="mb-4">{t('calendar.title')}</h3>
                <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                    <div key={day} className="py-1">{day}</div>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-2">
                  {Array.from({ length: firstWeekday }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="h-9" />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, idx) => {
                    const day = idx + 1;
                    const count = appointmentDots.get(day) ?? 0;
                    const isToday = day === now.getDate();
                    return (
                      <div key={day} className={`relative flex h-9 items-center justify-center rounded-lg text-sm ${isToday ? 'bg-primary/10 text-primary' : 'bg-muted/30'}`}>
                        {day}
                        {count > 0 ? <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-primary" /> : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {myAppointments.length > 0 ? (
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                  <h3 className="mb-3">{t('patient.appointments')}</h3>
                  <div className="space-y-2">
                    {myAppointments.map((appointment) => (
                      <div key={appointment.id} className="rounded-2xl border border-border bg-muted/40 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm text-muted-foreground">{appointment.dateLabel} • {appointment.time}</p>
                            <p className="mt-1 text-sm">{appointment.therapistName}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{t(`calendar.type.${appointment.type}`)}</p>
                          </div>
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                            {t(`calendar.status.${appointment.status}`)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {pendingAppointments.length > 0 ? (
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                  <h3 className="mb-3">{t('booking.pendingTitle')}</h3>
                  <div className="space-y-3">
                    {pendingAppointments.map((appointment) => (
                      <div key={appointment.id} className="rounded-2xl border border-border bg-muted/40 p-4">
                        <p className="text-sm text-muted-foreground">{appointment.dateLabel}</p>
                        <p className="mt-1">{appointment.time}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{t(`calendar.type.${appointment.type}`)}</p>
                        <button
                          type="button"
                          onClick={() => {
                            void onConfirmAppointment(appointment.id);
                          }}
                          disabled={isMutating}
                          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {t('booking.confirmPending')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <BookingScreen
                availableSlots={data?.availableSlots ?? []}
                therapistName={profile?.therapistName}
                therapistTitle={profile?.therapistTitle}
                onBookAppointment={onBookAppointment}
                isBooking={isMutating}
              />
            </div>
          )}
          {activeTab === 'chat' && (
            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <div className="rounded-3xl border border-border bg-card p-4">
                <h3 className="mb-3">{t('dashboard.chat')}</h3>
                <div className="space-y-2">
                  {sortedThreads.length > 0 ? sortedThreads.map((thread) => (
                    <button
                      key={thread.therapistId}
                      type="button"
                      onClick={() => setSelectedThreadId(thread.therapistId)}
                      className={`w-full rounded-2xl border p-3 text-left transition-all ${
                        (selectedThread?.therapistId ?? sortedThreads[0]?.therapistId) === thread.therapistId
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p>{thread.therapistName}</p>
                        {thread.unreadCount > 0 ? (
                          <span className="inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500" title={t('chat.unreadMessages')} />
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">{formatPresence(thread.isOnline, thread.therapistLastSeenAt)}</p>
                    </button>
                  )) : (
                    <p className="text-sm text-muted-foreground">{t('chat.noMessagesHint')}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {selectedThread ? (
                  <>
                    <div className="flex h-[calc(100vh-240px)] min-h-[560px] flex-col overflow-hidden rounded-3xl border border-border bg-background">
                      <div className="bg-card border-b border-border px-6 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
                              <ArrowLeft className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-3 rounded-xl px-3 py-2">
                              <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                                  {selectedThread.therapistName.split(' ').map((namePart) => namePart[0]).join('')}
                                </div>
                                {selectedThread.isOnline ? (
                                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                                ) : null}
                              </div>
                              <div className="text-left">
                                <h4>{selectedThread.therapistName}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {selectedThread.isOnline
                                    ? <span className="text-green-500">● {t('chat.online')}</span>
                                    : formatPresence(selectedThread.isOnline, selectedThread.therapistLastSeenAt)}
                                </p>
                              </div>
                            </div>
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
                              onClick={() => {
                                handleStartCall('audio');
                              }}
                              className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                            >
                              <Phone className="w-5 h-5 text-muted-foreground" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleStartCall('video');
                              }}
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

                      <div className="bg-card px-6 pb-4">
                        <p className="text-xs text-muted-foreground">{selectedThread.therapistEmail}</p>
                        {selectedThreadSlots.length > 0 ? (
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-2">
                              {selectedThreadSlots.slice(0, 8).map((slot) => (
                                <button
                                  key={slot.id}
                                  type="button"
                                  disabled={isMutating}
                                  onClick={() => {
                                    void onBookAppointment(slot.id);
                                  }}
                                  className="rounded-xl border border-border bg-muted/50 px-2.5 py-1.5 text-xs hover:bg-muted disabled:opacity-60"
                                >
                                  {slot.day} {slot.date} • {slot.time}
                                </button>
                              ))}
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">{t('booking.requestHint')}</p>
                          </div>
                        ) : null}
                      </div>

                      {search.isOpen && <ChatSearchBar search={search} />}

                      <div
                        ref={(node) => {
                          chatScrollRef.current = node;
                          search.containerRef.current = node;
                        }}
                        className="flex-1 overflow-y-auto p-6"
                      >
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

                              <div className={`flex ${message.sender === 'patient' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] ${message.sender === 'patient' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground'} rounded-2xl px-4 py-3`}>
                                  <p>
                                    <HighlightedText
                                      text={message.text}
                                      query={search.normalizedQuery}
                                      activeOccurrence={search.activeMatch?.messageId === message.id ? search.activeMatch.occurrence : -1}
                                    />
                                  </p>
                                  <div className={`mt-1 flex items-center justify-end gap-1 text-xs ${message.sender === 'patient' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                    <span>{message.time}</span>
                                    {message.sender === 'patient' ? (
                                      message.isRead
                                        ? <CheckCheck className="h-3.5 w-3.5 text-green-300" />
                                        : <Check className="h-3.5 w-3.5 opacity-70" />
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {selectedThread.messages.length === 0 ? (
                          <div className="flex h-full items-center justify-center">
                            <p className="text-sm text-muted-foreground">{t('chat.startChat')}</p>
                          </div>
                        ) : null}
                      </div>

                      {search.isOpen && search.normalizedQuery ? (
                        <ChatSearchNav search={search} />
                      ) : (
                      <div className="border-t border-border bg-card p-4">
                        <div className="flex items-center gap-3">
                          <input
                            value={chatInput}
                            onChange={(event) => setChatInput(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' && chatInput.trim()) {
                                void onSendMessageToTherapist(selectedThread.therapistId, selectedThread.conversationId, chatInput.trim());
                                setChatInput('');
                              }
                            }}
                            placeholder={t('chat.typeMessage')}
                            className="flex-1 bg-input-background rounded-xl px-4 py-3 border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                          />

                          <button
                            type="button"
                            disabled={isMutating || !chatInput.trim()}
                            onClick={() => {
                              if (!chatInput.trim()) return;
                              void onSendMessageToTherapist(selectedThread.therapistId, selectedThread.conversationId, chatInput.trim());
                              setChatInput('');
                            }}
                            className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-60"
                          >
                            <Send className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-3xl border border-dashed border-border bg-card p-6 text-center text-muted-foreground">
                    {t('patient.noTherapist')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card p-3 md:hidden">
        <div className="mx-auto flex max-w-md justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
