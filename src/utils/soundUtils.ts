/**
 * Audio utility to preload and play sound effects with zero latency
 */

const COMPLETION_SOUND_URL = '/sound/universfield-cinematic-piano-hit-567216.mp3';
const ADD_SOUND_URL = '/sound/u_o8xh7gwsrj-correct_answer_toy_bi-bling-476370.mp3';

let completionAudio: HTMLAudioElement | null = null;
let addAudio: HTMLAudioElement | null = null;
let isPreloaded = false;

export function preloadAppSounds() {
  if (typeof window === 'undefined' || isPreloaded) return;

  try {
    if (!completionAudio) {
      completionAudio = new Audio(COMPLETION_SOUND_URL);
      completionAudio.preload = 'auto';
      completionAudio.load();
    }

    if (!addAudio) {
      addAudio = new Audio(ADD_SOUND_URL);
      addAudio.preload = 'auto';
      addAudio.load();
    }

    isPreloaded = true;
  } catch (err) {
    console.warn('Sound preload warning:', err);
  }
}

// Auto-preload on module evaluation
if (typeof window !== 'undefined') {
  preloadAppSounds();
}

export function playTaskCompletionSound(volume: number = 0.5) {
  try {
    if (!completionAudio) {
      completionAudio = new Audio(COMPLETION_SOUND_URL);
      completionAudio.preload = 'auto';
    }
    completionAudio.volume = volume;
    completionAudio.currentTime = 0;
    const playPromise = completionAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Audio playback was prevented:', err);
      });
    }
  } catch (error) {
    console.warn('Could not play sound:', error);
  }
}

export function playTaskAddSound(volume: number = 0.5) {
  try {
    if (!addAudio) {
      addAudio = new Audio(ADD_SOUND_URL);
      addAudio.preload = 'auto';
    }
    addAudio.volume = volume;
    addAudio.currentTime = 0;
    const playPromise = addAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Audio playback was prevented:', err);
      });
    }
  } catch (error) {
    console.warn('Could not play sound:', error);
  }
}
