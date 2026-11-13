import type { Clip } from './clips';

/** Why a recording could not start: the browser cannot record, or the microphone was not allowed. */
export class RecorderFailure extends Error {
  constructor(public reason: 'unsupported' | 'blocked') {
    super(reason);
  }
}

/** A clip stops by itself after this long, so a forgotten recording cannot fill the device. */
export const MAX_MS = 8000;

/** Sound formats to try, best first. Chrome and Firefox take the first; Safari takes audio/mp4. */
const FORMATS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

export function canRecord(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}

export interface Recording {
  /** Finish and hand back the clip. */
  stop(): Promise<Clip>;
  /** Throw the recording away. */
  cancel(): void;
}

/** Ask for the microphone and start recording. The microphone is released as soon as the recording ends. */
export async function startRecording(): Promise<Recording> {
  if (!canRecord()) throw new RecorderFailure('unsupported');
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    throw new RecorderFailure('blocked');
  }
  const format = FORMATS.find((f) => MediaRecorder.isTypeSupported(f));
  const recorder = new MediaRecorder(stream, format ? { mimeType: format } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const release = () => stream.getTracks().forEach((t) => t.stop());
  const finished = new Promise<Clip>((resolve) => {
    recorder.onstop = () => {
      release();
      const blob = new Blob(chunks, { type: recorder.mimeType || format || 'audio/webm' });
      void blob.arrayBuffer().then((data) => resolve({ type: blob.type, data }));
    };
  });
  recorder.start();
  return {
    stop() {
      if (recorder.state !== 'inactive') recorder.stop();
      return finished;
    },
    cancel() {
      recorder.ondataavailable = null;
      if (recorder.state !== 'inactive') recorder.stop();
      release();
    },
  };
}

let playing: HTMLAudioElement | null = null;

/** Play a clip, stopping any clip already playing. */
export function playClip(clip: Clip): Promise<void> {
  playing?.pause();
  const url = URL.createObjectURL(new Blob([clip.data], { type: clip.type }));
  const audio = new Audio(url);
  playing = audio;
  const free = () => URL.revokeObjectURL(url);
  audio.onended = free;
  audio.onerror = free;
  return audio.play();
}

/** Play a sound file that comes with the app, stopping any clip already playing. */
export function playFile(url: string): Promise<void> {
  playing?.pause();
  const audio = new Audio(url);
  playing = audio;
  return audio.play();
}
