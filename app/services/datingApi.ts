import { File, UploadType } from 'expo-file-system';

import { apiUrl } from '@/constants/config';
import { getAccessToken } from '@/lib/auth-storage';
import { apiRequest } from '@/services/authApi';
import type {
  ChatMessage,
  ConversationItem,
  FeedComment,
  FeedPost,
  LikesSummary,
  MatchItem,
  MyProfile,
  Person,
  Photo,
  StoryItem,
} from '@/lib/fixtures';
import {
  FIXTURE_CONVERSATIONS,
  FIXTURE_FEED,
  FIXTURE_MATCHES,
  FIXTURE_NEARBY,
  FIXTURE_PROFILE,
  FIXTURE_STORIES,
  interestText,
} from '@/lib/fixtures';
import { isNetworkError, setFixtureMode } from '@/lib/fixture-mode';

export type { ChatMessage };

export type SwipeAction = 'like' | 'pass' | 'superlike';
export type SwipeResult = {
  matched: boolean;
  match_id?: string;
  conversation_id?: string;
  person?: Person;
};

export type PatchProfileBody = Partial<{
  display_name: string;
  gender: string;
  looking_for: string[];
  intent: string;
  birthday: string;
  city: string;
  country: string;
  about: string;
  interests: string[];
  min_age: number;
  max_age: number;
  max_distance_km: number;
  lat: number;
  lng: number;
  complete_onboarding: boolean;
}>;

/**
 * Reads fall back to fixtures in dev only when the BFF is unreachable, so the
 * UI can be worked on without a server. HTTP errors (401/404/500) still throw.
 */
async function withFixtureFallback<T>(fn: () => Promise<T>, fixture: () => T): Promise<T> {
  try {
    const out = await fn();
    setFixtureMode(false);
    return out;
  } catch (e) {
    if (__DEV__ && isNetworkError(e)) {
      setFixtureMode(true, e instanceof Error ? e.message : 'network');
      return fixture();
    }
    throw e;
  }
}

const IMAGE_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heic',
};

function imageMime(mimeType: string | undefined, nameOrUri: string): string {
  const raw = (mimeType || '').split(';')[0].trim().toLowerCase();
  if (raw === 'image/jpg') return 'image/jpeg';
  if (raw === 'image/jpeg' || raw === 'image/png' || raw === 'image/webp' || raw === 'image/heic' || raw === 'image/heif') {
    return raw === 'image/heif' ? 'image/heic' : raw;
  }
  const ext = nameOrUri.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_MIME[ext] ?? 'image/jpeg';
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export const datingApi = {
  // ---- self -------------------------------------------------------------
  profile: () =>
    withFixtureFallback(() => apiRequest<MyProfile>('/user/profile'), () => FIXTURE_PROFILE),
  patchProfile: (body: PatchProfileBody) =>
    apiRequest<MyProfile>('/user/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  setLocation: (lat: number, lng: number, city?: string) =>
    apiRequest<MyProfile>('/user/profile/location', {
      method: 'POST',
      body: JSON.stringify({ lat, lng, city }),
    }),
  uploadPhoto: async (uri: string, mimeType?: string, fileName?: string) => {
    const file = new File(uri);
    if (!file.exists || file.size === 0) throw new Error('Could not read that photo');
    const token = await getAccessToken();
    const result = await file.upload(apiUrl('/user/profile/photos'), {
      httpMethod: 'POST',
      uploadType: UploadType.MULTIPART,
      fieldName: 'file',
      mimeType: imageMime(mimeType, fileName || file.name || uri),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      sessionType: 'foreground',
    });
    if (result.status < 200 || result.status >= 300) {
      let message = `HTTP ${result.status}`;
      try {
        const body = JSON.parse(result.body) as { error?: string; message?: string };
        message = body.message || body.error || message;
      } catch {
        if (result.body) message = result.body;
      }
      throw new Error(message);
    }
    return JSON.parse(result.body) as Photo[];
  },
  deletePhoto: (id: string) => apiRequest<Photo[]>(`/user/profile/photos/${id}`, { method: 'DELETE' }),
  reorderPhotos: (ids: string[]) =>
    apiRequest<Photo[]>('/user/profile/photos/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),
  deleteAccount: () => apiRequest<{ ok: boolean }>('/user/me', { method: 'DELETE' }),
  registerDevice: (token: string, platform: string) =>
    apiRequest<{ ok: boolean }>('/user/devices', { method: 'POST', body: JSON.stringify({ token, platform }) }),
  unregisterDevice: (token: string) =>
    apiRequest<{ ok: boolean }>('/user/devices', { method: 'DELETE', body: JSON.stringify({ token }) }),
  blockedUsers: () =>
    withFixtureFallback(() => apiRequest<Person[]>('/user/blocked'), () => []),

  // ---- discover ---------------------------------------------------------
  stories: () =>
    withFixtureFallback(() => apiRequest<StoryItem[]>('/stories'), () => FIXTURE_STORIES),
  discover: (opts: { interest?: string; limit?: number; offset?: number; maxKm?: number; intent?: 'friends' | 'partner'; city?: string } = {}) =>
    withFixtureFallback(
      () =>
        apiRequest<Person[]>(
          `/discover/nearby${qs({
            interest: opts.interest,
            limit: opts.limit,
            offset: opts.offset,
            max_km: opts.maxKm,
            intent: opts.intent,
            city: opts.city,
          })}`,
        ),
      () => {
        if (!opts.interest) return FIXTURE_NEARBY;
        const want = interestText(opts.interest).toLowerCase();
        const hits = FIXTURE_NEARBY.filter((p) =>
          p.interests.some((i) => interestText(i).toLowerCase() === want),
        );
        return hits.length ? hits : FIXTURE_NEARBY;
      },
    ),
  person: (id: string) =>
    withFixtureFallback(
      () => apiRequest<Person>(`/discover/people/${id}`),
      () => FIXTURE_NEARBY.find((p) => p.id === id) ?? FIXTURE_NEARBY[0],
    ),

  // ---- swipes / matches --------------------------------------------------
  swipe: (targetId: string, action: SwipeAction, mode?: 'friends' | 'partner') =>
    apiRequest<SwipeResult>('/swipe', {
      method: 'POST',
      body: JSON.stringify({ target_id: targetId, action, mode }),
    }),
  likes: () =>
    withFixtureFallback(
      () => apiRequest<LikesSummary>('/likes'),
      () => ({ received: 3, matches: FIXTURE_MATCHES.length, people: FIXTURE_NEARBY.slice(0, 3) }),
    ),
  matches: () =>
    withFixtureFallback(() => apiRequest<MatchItem[]>('/matches'), () => FIXTURE_MATCHES),
  unmatch: (matchId: string) => apiRequest<{ ok: boolean }>(`/matches/${matchId}`, { method: 'DELETE' }),

  // ---- chat -------------------------------------------------------------
  conversations: () =>
    withFixtureFallback(
      () => apiRequest<ConversationItem[]>('/messages/conversations'),
      () => FIXTURE_CONVERSATIONS,
    ),
  messages: (conversationId: string, before?: string, limit = 50) =>
    withFixtureFallback(
      () =>
        apiRequest<ChatMessage[]>(`/messages/conversations/${conversationId}${qs({ before, limit })}`),
      () =>
        before
          ? []
          : [
              {
                id: 'm1',
                senderId: 'peer',
                body: 'Hey! Nice to match with you 👋',
                mine: false,
                created_at: new Date().toISOString(),
              },
            ],
    ),
  sendMessage: (conversationId: string, body: string) =>
    apiRequest<ChatMessage>(`/messages/conversations/${conversationId}`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  // ---- feed -------------------------------------------------------------
  feed: (opts: { mode?: 'friends' | 'partner'; cursor?: string; limit?: number } = {}) =>
    withFixtureFallback(
      () => apiRequest<FeedPost[]>(`/feed${qs({ mode: opts.mode, cursor: opts.cursor, limit: opts.limit })}`),
      () => (opts.cursor ? [] : FIXTURE_FEED),
    ),
  createPost: (body: { mode: 'friends' | 'partner'; category: string; question: string }) =>
    apiRequest<FeedPost>('/feed', { method: 'POST', body: JSON.stringify(body) }),
  toggleLike: (postId: string) =>
    apiRequest<{ liked: boolean; likeCount: number }>(`/feed/${postId}/like`, { method: 'POST' }),
  comments: (postId: string) =>
    withFixtureFallback(() => apiRequest<FeedComment[]>(`/feed/${postId}/comments`), () => []),
  addComment: (postId: string, body: string) =>
    apiRequest<FeedComment>(`/feed/${postId}/comments`, { method: 'POST', body: JSON.stringify({ body }) }),

  // ---- safety -----------------------------------------------------------
  block: (userId: string) => apiRequest<{ ok: boolean }>(`/users/${userId}/block`, { method: 'POST' }),
  unblock: (userId: string) => apiRequest<{ ok: boolean }>(`/users/${userId}/block`, { method: 'DELETE' }),
  report: (userId: string, reason: string, details?: string) =>
    apiRequest<{ ok: boolean }>(`/users/${userId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
    }),
};
