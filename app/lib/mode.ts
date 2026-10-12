import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

/**
 * The app's single browsing mode. It drives the Home feed, the swipe deck and the
 * wording of matches. Persisted across launches; first value comes from the
 * onboarding intent (see useModeBootstrap).
 */
export type Mode = 'friends' | 'partner';

const KEY = 'palora_mode';
const LEGACY_KEY = 'flick_mode';

let current: Mode = 'friends';
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function getMode(): Mode {
  return current;
}

export function setMode(m: Mode) {
  if (current === m && hydrated) return;
  current = m;
  hydrated = true;
  emit();
  SecureStore.setItemAsync(KEY, m).catch(() => {});
  SecureStore.deleteItemAsync(LEGACY_KEY).catch(() => {});
}

export function toggleMode() {
  setMode(current === 'friends' ? 'partner' : 'friends');
}

async function readStored(): Promise<Mode | null> {
  try {
    const v = await SecureStore.getItemAsync(KEY);
    if (v === 'friends' || v === 'partner') return v;
    const legacy = await SecureStore.getItemAsync(LEGACY_KEY);
    return legacy === 'friends' || legacy === 'partner' ? legacy : null;
  } catch {
    return null;
  }
}

/**
 * Loads the persisted mode once; if none is stored yet, derives it from the
 * profile intent (partner → Dating, otherwise Friends, the lower-pressure surface).
 */
export function useModeBootstrap(intent: string | undefined) {
  useEffect(() => {
    if (hydrated || !intent) return;
    let cancelled = false;
    readStored().then((stored) => {
      if (cancelled || hydrated) return;
      current = stored ?? (intent === 'partner' ? 'partner' : 'friends');
      hydrated = true;
      emit();
    });
    return () => {
      cancelled = true;
    };
  }, [intent]);
}

export function useMode(): [Mode, (m: Mode) => void] {
  const [, tick] = useState(0);
  useEffect(() => {
    const l = () => tick((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return [current, setMode];
}

export const MODE_LABEL: Record<Mode, string> = { friends: 'Make Friends', partner: 'Search Partners' };

/** Copy that changes with the mode, in one place. */
export const MODE_COPY = {
  friends: {
    connect: 'Connect',
    sent: 'Sent',
    stamp: 'CONNECT',
    matchTitle: 'You’re connected!',
    matchBody: (name: string) => `You and ${name} both want to be friends.`,
    keepGoing: 'Keep browsing',
    feedHeading: 'Icebreakers',
  },
  partner: {
    connect: 'Interested',
    sent: 'Sent',
    stamp: 'LIKE',
    matchTitle: 'It’s a match!',
    matchBody: (name: string) => `You and ${name} liked each other.`,
    keepGoing: 'Keep swiping',
    feedHeading: 'Conversation starters',
  },
} as const;
