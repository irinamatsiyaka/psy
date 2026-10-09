import { useCallback, useEffect, useRef, useState } from 'react';

export type CallKind = 'audio' | 'video';
export type CallPhase = 'connecting' | 'connected';

// Ringback ("гудки"): two long beeps, then the other side picks up.
const RING_FREQUENCY_HZ = 425;
const RING_BEEP_STARTS_S = [0.4, 3.4];
const RING_BEEP_LENGTH_S = 1;
const CONNECT_DELAY_MS = 5600;

const scheduleBeep = (ctx: AudioContext, startAt: number, length: number, frequency: number, volume: number): OscillatorNode => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.04);
  gain.gain.setValueAtTime(volume, startAt + length - 0.06);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + length);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + length + 0.02);
  return osc;
};

/**
 * Drives a (simulated) call: ringback tones while connecting, then a connected phase with
 * a timer and, when permitted, the real microphone / camera of the user.
 */
export function useCallSession(kind: CallKind) {
  const [phase, setPhase] = useState<CallPhase>('connecting');
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const ctx = AudioContextClass ? new AudioContextClass() : null;
    audioCtxRef.current = ctx;
    const oscillators: OscillatorNode[] = [];

    if (ctx) {
      void ctx.resume().catch(() => {});
      const base = ctx.currentTime;
      for (const start of RING_BEEP_STARTS_S) {
        oscillators.push(scheduleBeep(ctx, base + start, RING_BEEP_LENGTH_S, RING_FREQUENCY_HZ, 0.12));
      }
    }

    const connectTimer = window.setTimeout(() => {
      if (ctx && ctx.state !== 'closed') {
        // Short "picked up" chirp.
        const now = ctx.currentTime;
        scheduleBeep(ctx, now, 0.12, 880, 0.12);
        scheduleBeep(ctx, now + 0.16, 0.18, 660, 0.12);
      }
      setPhase('connected');
    }, CONNECT_DELAY_MS);

    return () => {
      window.clearTimeout(connectTimer);
      for (const osc of oscillators) {
        try {
          osc.stop();
        } catch {
          // Already stopped.
        }
      }
      audioCtxRef.current = null;
      if (ctx) {
        window.setTimeout(() => {
          if (ctx.state !== 'closed') {
            void ctx.close().catch(() => {});
          }
        }, 600);
      }
    };
  }, []);

  useEffect(() => {
    if (phase !== 'connected') {
      return;
    }
    const timerId = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timerId);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'connected') {
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMediaError('unsupported');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === 'video' });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        setLocalStream(stream);
      } catch (error) {
        if (!cancelled) {
          setMediaError(error instanceof Error ? error.name : 'unknown');
        }
      }
    };
    void start();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    };
  }, [phase, kind]);

  useEffect(() => {
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }, [localStream, muted]);

  useEffect(() => {
    localStream?.getVideoTracks().forEach((track) => {
      track.enabled = !cameraOff;
    });
  }, [localStream, cameraOff]);

  // Live microphone level (0..1) for the audio-call visualiser.
  useEffect(() => {
    if (!localStream || localStream.getAudioTracks().length === 0) {
      setMicLevel(0);
      return;
    }
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const ctx = new AudioContextClass();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const source = ctx.createMediaStreamSource(localStream);
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);

    const intervalId = window.setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const sample of data) {
        peak = Math.max(peak, Math.abs(sample - 128));
      }
      setMicLevel(Math.min(1, peak / 64));
    }, 90);

    return () => {
      window.clearInterval(intervalId);
      source.disconnect();
      void ctx.close().catch(() => {});
      setMicLevel(0);
    };
  }, [localStream]);

  const playHangupTone = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === 'closed') {
      return;
    }
    const now = ctx.currentTime;
    scheduleBeep(ctx, now, 0.18, 480, 0.1);
    scheduleBeep(ctx, now + 0.26, 0.18, 480, 0.1);
  }, []);

  const toggleMute = useCallback(() => setMuted((value) => !value), []);
  const toggleCamera = useCallback(() => setCameraOff((value) => !value), []);

  return { phase, elapsed, muted, cameraOff, localStream, mediaError, micLevel: muted ? 0 : micLevel, toggleMute, toggleCamera, playHangupTone };
}

export const formatCallTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const rest = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${rest}`;
};
