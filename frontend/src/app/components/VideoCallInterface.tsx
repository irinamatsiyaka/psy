import { useState } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, ArrowLeft, FileText, Sparkles, Download } from 'lucide-react';
import type { PsychologistPatient } from '../types/app';
import { useTranslation } from '../hooks/useTranslation';
import { formatCallTime, useCallSession, type CallKind } from '../hooks/useCallSession';
import { CallConnecting, LocalVideo, MicLevelBars, getInitials } from './CallOverlay';

interface VideoCallInterfaceProps {
  patient: PsychologistPatient;
  psychologistName: string;
  kind: CallKind;
  onBack: () => void;
}

export function VideoCallInterface({ patient, psychologistName, kind, onBack }: VideoCallInterfaceProps) {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(true);
  const session = useCallSession(kind);

  const transcription = patient.videoSession?.transcript ?? [];
  const aiNotes = patient.videoSession?.aiNotes ?? [];

  const handleEndCall = () => {
    session.playHangupTone();
    setIsRecording(false);
    onBack();
  };

  if (session.phase === 'connecting') {
    return <CallConnecting name={patient.name} kind={kind} onCancel={handleEndCall} className="flex-1" />;
  }

  const showCamera = kind === 'video' && session.localStream && !session.cameraOff;
  const mediaProblem = session.mediaError
    ? (session.mediaError === 'unsupported' ? t('call.mediaUnsupported') : t('call.mediaDenied'))
    : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <div className="bg-card border-b border-border px-6 py-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('video.endSession')}
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h2>{t(kind === 'video' ? 'video.sessionWith' : 'video.audioSessionWith', { name: patient.name })}</h2>
            <p className="text-sm text-muted-foreground">{patient.videoSession ? t('video.snapshotFrom', { date: patient.videoSession.startedAt }) : t('video.noLiveSession')}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
            <span className="text-sm text-muted-foreground">{isRecording ? t('video.recording') : t('video.stopped')}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 p-6 flex flex-col">
          <div className="flex-1 bg-card rounded-2xl overflow-hidden border border-border shadow-sm relative mb-4">
            {showCamera ? (
              <>
                <LocalVideo stream={session.localStream} className="absolute inset-0 w-full h-full" />
                <div className="absolute left-4 top-4 rounded-xl bg-black/50 px-3 py-1.5 text-sm text-white">
                  {patient.name} • {formatCallTime(session.elapsed)}
                </div>
                <div className="absolute bottom-6 right-6 w-48 h-36 rounded-2xl border-2 border-white bg-card shadow-lg flex flex-col items-center justify-center gap-2">
                  <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
                    <span className="text-lg">{getInitials(patient.name)}</span>
                  </div>
                  <span className="text-sm text-foreground">{patient.name}</span>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 bg-primary rounded-full mx-auto mb-4 flex items-center justify-center text-primary-foreground">
                    <span className="text-4xl">{getInitials(patient.name)}</span>
                  </div>
                  <p className="text-foreground text-xl">{patient.name}</p>
                  <p className="text-sm text-muted-foreground mt-2">{t('video.connectionGood')} • {formatCallTime(session.elapsed)}</p>
                  {kind === 'audio' && <MicLevelBars level={session.micLevel} muted={session.muted} tone="light" />}
                  {kind === 'video' && (
                    <p className="mt-3 text-sm text-muted-foreground">{t('call.cameraDisabled')}</p>
                  )}
                  {mediaProblem && (
                    <p className="mt-3 max-w-sm rounded-xl bg-destructive/10 px-4 py-2 text-sm text-destructive">{mediaProblem}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={session.toggleMute}
              title={session.muted ? t('call.unmute') : t('call.mute')}
              aria-label={session.muted ? t('call.unmute') : t('call.mute')}
              className={`w-16 h-16 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity shadow-lg ${
                session.muted ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground'
              }`}
            >
              {session.muted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </button>
            {kind === 'video' && (
              <button
                type="button"
                onClick={session.toggleCamera}
                title={session.cameraOff ? t('call.cameraOn') : t('call.cameraOff')}
                aria-label={session.cameraOff ? t('call.cameraOn') : t('call.cameraOff')}
                className={`w-16 h-16 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity shadow-lg ${
                  session.cameraOff ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground'
                }`}
              >
                {session.cameraOff ? <VideoOff className="w-7 h-7" /> : <Video className="w-7 h-7" />}
              </button>
            )}
            <button
              type="button"
              onClick={handleEndCall}
              title={t('call.end')}
              aria-label={t('call.end')}
              className="w-16 h-16 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:opacity-90 transition-opacity shadow-lg"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
          </div>
        </div>

        <div className="w-[500px] border-l border-border bg-card flex flex-col">
          <div className="border-b border-border">
            <div className="flex">
              <button className="flex-1 px-4 py-3 border-b-2 border-primary text-primary">
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">{t('video.liveTranscription')}</span>
                </div>
              </button>
              <button className="flex-1 px-4 py-3 border-b-2 border-transparent text-muted-foreground hover:text-foreground">
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm">{t('video.aiNotes')}</span>
                </div>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 text-secondary mb-2">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm">{patient.videoSession ? t('video.latestTranscript') : t('video.transcriptEmpty')}</span>
              </div>
            </div>

            {transcription.length > 0 ? transcription.map((entry, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{entry.time}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    entry.speaker === psychologistName
                      ? 'bg-primary/10 text-primary'
                      : 'bg-secondary/10 text-secondary'
                  }`}>
                    {entry.speaker}
                  </span>
                </div>
                <p className="text-sm">{entry.text}</p>
              </div>
            )) : (
              <div className="rounded-[1.75rem] border border-dashed border-border bg-background/60 p-6 text-center text-sm text-muted-foreground">
                {t('video.transcriptHint')}
              </div>
            )}
          </div>

          <div className="border-t border-border p-4 bg-muted/30">
            <h4 className="mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {t('video.aiSessionNotes')}
            </h4>
            <div className="space-y-2 mb-4">
              {aiNotes.length > 0 ? aiNotes.map((note, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span>{note}</span>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">{t('video.aiNotesEmpty')}</p>
              )}
            </div>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity text-sm">
              <Download className="w-4 h-4" />
              {t('video.exportNotes')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
