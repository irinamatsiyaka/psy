import { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { formatCallTime, useCallSession, type CallKind } from '../hooks/useCallSession';

export const getInitials = (name: string): string =>
  name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 3);

interface CallConnectingProps {
  name: string;
  kind: CallKind;
  onCancel: () => void;
  className?: string;
}

/** Outgoing-call screen shown while the ringback tones are playing. */
export function CallConnecting({ name, kind, onCancel, className = '' }: CallConnectingProps) {
  const { t } = useTranslation();

  return (
    <div className={`flex flex-col items-center justify-between bg-gradient-to-b from-slate-900 to-slate-800 text-white ${className}`}>
      <div className="flex flex-col items-center pt-20">
        <p className="mb-6 text-sm font-medium uppercase tracking-widest text-slate-400">
          {kind === 'video' ? t('call.videoCall') : t('call.audioCall')}
        </p>

        <div className="relative mb-6 flex h-28 w-28 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
          <span className="absolute -inset-3 animate-ping rounded-full bg-primary/20 [animation-delay:400ms]" />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-primary text-3xl font-semibold text-primary-foreground">
            {getInitials(name)}
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-white">{name}</h2>
        <p className="mt-2 text-base text-slate-400">{t('call.connecting')}</p>
      </div>

      <div className="mb-16 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform hover:scale-105 hover:bg-red-600 active:scale-95"
          title={t('call.cancel')}
          aria-label={t('call.cancel')}
        >
          <PhoneOff className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
}

interface MicLevelBarsProps {
  level: number;
  muted: boolean;
  tone?: 'dark' | 'light';
}

const BAR_WEIGHTS = [0.45, 0.7, 0.9, 1, 0.9, 0.7, 0.45];

/** Live microphone level visualiser used in audio calls. */
export function MicLevelBars({ level, muted, tone = 'dark' }: MicLevelBarsProps) {
  const barColor = muted ? 'bg-slate-500' : tone === 'dark' ? 'bg-green-400' : 'bg-primary';

  return (
    <div className="mt-6 flex h-12 items-center justify-center gap-1.5" aria-hidden="true">
      {BAR_WEIGHTS.map((weight, index) => (
        <span
          key={index}
          className={`w-1.5 rounded-full transition-all duration-100 ${barColor}`}
          style={{ height: `${Math.max(6, Math.round(6 + level * weight * 42))}px` }}
        />
      ))}
    </div>
  );
}

interface LocalVideoProps {
  stream: MediaStream | null;
  className?: string;
}

export function LocalVideo({ stream, className = '' }: LocalVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return <video ref={videoRef} autoPlay muted playsInline className={`-scale-x-100 object-cover ${className}`} />;
}

interface CallOverlayProps {
  therapistName: string;
  kind: CallKind;
  onEnd: () => void;
}

export function CallOverlay({ therapistName, kind, onEnd }: CallOverlayProps) {
  const { t } = useTranslation();
  const session = useCallSession(kind);

  const handleEnd = () => {
    session.playHangupTone();
    onEnd();
  };

  if (session.phase === 'connecting') {
    return <CallConnecting name={therapistName} kind={kind} onCancel={handleEnd} className="fixed inset-0 z-50" />;
  }

  const showCamera = kind === 'video' && session.localStream && !session.cameraOff;
  const mediaProblem = session.mediaError
    ? (session.mediaError === 'unsupported' ? t('call.mediaUnsupported') : t('call.mediaDenied'))
    : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {showCamera && (
        <LocalVideo stream={session.localStream} className="absolute inset-0 h-full w-full" />
      )}

      <div className="relative z-10 flex w-full flex-1 flex-col items-center pt-16">
        <p className="mb-6 text-sm font-medium uppercase tracking-widest text-slate-300 drop-shadow">
          {kind === 'video' ? t('call.videoCall') : t('call.audioCall')}
        </p>

        {!showCamera && (
          <div className="relative mb-6">
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-primary text-3xl font-semibold text-primary-foreground">
              {getInitials(therapistName)}
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 ring-2 ring-slate-900">
              <span className="h-2 w-2 rounded-full bg-white" />
            </span>
          </div>
        )}

        <h2 className="text-2xl font-semibold text-white drop-shadow">{therapistName}</h2>
        <p className="mt-2 text-base tabular-nums text-slate-200 drop-shadow">{formatCallTime(session.elapsed)}</p>

        {kind === 'audio' && <MicLevelBars level={session.micLevel} muted={session.muted} />}

        {mediaProblem && (
          <p className="mt-4 max-w-xs rounded-xl bg-red-500/20 px-4 py-2 text-center text-sm text-red-200">{mediaProblem}</p>
        )}

        {kind === 'video' && showCamera && (
          <div className="absolute bottom-48 right-4 flex h-40 w-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-white/80 bg-slate-800/90 shadow-lg sm:h-48 sm:w-36">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
              {getInitials(therapistName)}
            </div>
            <span className="px-2 text-center text-xs text-slate-200">{therapistName}</span>
          </div>
        )}

        {kind === 'video' && !showCamera && (
          <p className="mt-4 text-sm text-slate-300">{t('call.cameraDisabled')}</p>
        )}
      </div>

      <div className="relative z-10 mb-16 flex flex-col items-center gap-8">
        <div className="flex gap-8">
          <button
            type="button"
            onClick={session.toggleMute}
            className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
              session.muted ? 'bg-white text-slate-900' : 'bg-slate-700 text-white hover:bg-slate-600'
            }`}
            title={session.muted ? t('call.unmute') : t('call.mute')}
            aria-label={session.muted ? t('call.unmute') : t('call.mute')}
          >
            {session.muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>
          {kind === 'video' && (
            <button
              type="button"
              onClick={session.toggleCamera}
              className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
                session.cameraOff ? 'bg-white text-slate-900' : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
              title={session.cameraOff ? t('call.cameraOn') : t('call.cameraOff')}
              aria-label={session.cameraOff ? t('call.cameraOn') : t('call.cameraOff')}
            >
              {session.cameraOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleEnd}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform hover:scale-105 hover:bg-red-600 active:scale-95"
          title={t('call.end')}
          aria-label={t('call.end')}
        >
          <PhoneOff className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
}
