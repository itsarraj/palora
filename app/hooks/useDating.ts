import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import type { ChatMessage, FeedPost, MatchItem, MyProfile } from '@/lib/fixtures';
import type { Mode } from '@/lib/mode';
import { datingApi, type PatchProfileBody, type SwipeAction } from '@/services/datingApi';

export const datingKeys = {
  all: ['dating'] as const,
  profile: ['dating', 'profile'] as const,
  blocked: ['dating', 'blocked'] as const,
  stories: ['dating', 'stories'] as const,
  feed: (mode?: string) => ['dating', 'feed', mode ?? 'all'] as const,
  comments: (postId: string) => ['dating', 'comments', postId] as const,
  discover: (interest?: string) => ['dating', 'discover', interest ?? 'all'] as const,
  deck: ['dating', 'deck'] as const,
  deckFor: (mode: Mode) => ['dating', 'deck', mode] as const,
  person: (id: string) => ['dating', 'person', id] as const,
  likes: ['dating', 'likes'] as const,
  matches: ['dating', 'matches'] as const,
  conversations: ['dating', 'conversations'] as const,
  messages: (id: string) => ['dating', 'messages', id] as const,
};

// ---- self -------------------------------------------------------------------

export function useProfile(enabled = true) {
  return useQuery({ queryKey: datingKeys.profile, queryFn: () => datingApi.profile(), enabled, staleTime: 30_000 });
}

export function usePatchProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PatchProfileBody) => datingApi.patchProfile(body),
    onSuccess: (profile) => {
      qc.setQueryData<MyProfile>(datingKeys.profile, profile);
      qc.invalidateQueries({ queryKey: datingKeys.deck });
      qc.invalidateQueries({ queryKey: ['dating', 'discover'] });
    },
  });
}

export function useSetLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { lat: number; lng: number; city?: string }) => datingApi.setLocation(v.lat, v.lng, v.city),
    onSuccess: (profile) => {
      qc.setQueryData<MyProfile>(datingKeys.profile, profile);
      qc.invalidateQueries({ queryKey: ['dating', 'discover'] });
      qc.invalidateQueries({ queryKey: datingKeys.deck });
    },
  });
}

export function useUploadPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { uri: string; mimeType?: string; fileName?: string }) =>
      datingApi.uploadPhoto(v.uri, v.mimeType, v.fileName),
    onSuccess: (photos) => {
      qc.setQueryData<MyProfile>(datingKeys.profile, (old) => (old ? { ...old, photos } : old));
    },
  });
}

export function useDeletePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => datingApi.deletePhoto(id),
    onSuccess: (photos) => {
      qc.setQueryData<MyProfile>(datingKeys.profile, (old) => (old ? { ...old, photos } : old));
    },
  });
}

export function useReorderPhotos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => datingApi.reorderPhotos(ids),
    onSuccess: (photos) => {
      qc.setQueryData<MyProfile>(datingKeys.profile, (old) => (old ? { ...old, photos } : old));
    },
  });
}

export function useDeleteAccount() {
  return useMutation({ mutationFn: () => datingApi.deleteAccount() });
}

export function useBlockedUsers() {
  return useQuery({ queryKey: datingKeys.blocked, queryFn: () => datingApi.blockedUsers() });
}

// ---- discover ---------------------------------------------------------------

export function useStories() {
  return useQuery({ queryKey: datingKeys.stories, queryFn: () => datingApi.stories() });
}

const DISCOVER_PAGE = 20;

export function useDiscover(interest?: string) {
  return useInfiniteQuery({
    queryKey: datingKeys.discover(interest),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => datingApi.discover({ interest, limit: DISCOVER_PAGE, offset: pageParam }),
    getNextPageParam: (last, pages) => (last.length < DISCOVER_PAGE ? undefined : pages.length * DISCOVER_PAGE),
  });
}

/** Swipe deck for the current mode: people open to friends or dating respectively. */
export function useDeck(mode: Mode) {
  return useQuery({
    queryKey: datingKeys.deckFor(mode),
    queryFn: () => datingApi.discover({ limit: 30, intent: mode }),
    staleTime: 0,
  });
}

export function usePerson(id: string | undefined) {
  return useQuery({
    queryKey: datingKeys.person(id || ''),
    queryFn: () => datingApi.person(id!),
    enabled: Boolean(id),
  });
}

// ---- swipe / matches --------------------------------------------------------

type FeedPages = { pages: FeedPost[][]; pageParams: unknown[] };

/** Like / pass / superlike a person, from the deck, a profile, or a feed post. */
export function useSwipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ targetId, action, mode }: { targetId: string; action: SwipeAction; mode?: Mode }) =>
      datingApi.swipe(targetId, action, mode),
    onSuccess: (res, { targetId, action }) => {
      qc.invalidateQueries({ queryKey: datingKeys.likes });
      if (res.matched) {
        qc.invalidateQueries({ queryKey: datingKeys.matches });
        qc.invalidateQueries({ queryKey: datingKeys.conversations });
      }
      // Reflect the new relation on every cached feed post by this author.
      const relation = res.matched ? 'matched' : action === 'pass' ? 'none' : 'liked';
      qc.setQueriesData<FeedPages>({ queryKey: ['dating', 'feed'] }, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((pg) =>
                pg.map((p) => (p.authorId === targetId ? { ...p, relation, conversationId: res.conversation_id ?? p.conversationId } : p)),
              ),
            }
          : old,
      );
    },
    onSettled: () => {
      // Person is consumed either way; discover lists and the deck exclude swiped users.
      qc.invalidateQueries({ queryKey: ['dating', 'discover'] });
      qc.invalidateQueries({ queryKey: datingKeys.deck });
    },
  });
}

export function useLikes() {
  return useQuery({ queryKey: datingKeys.likes, queryFn: () => datingApi.likes() });
}

export function useMatches() {
  return useQuery({ queryKey: datingKeys.matches, queryFn: () => datingApi.matches() });
}

export function useUnmatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => datingApi.unmatch(matchId),
    onSuccess: (_r, matchId) => {
      qc.setQueryData<MatchItem[]>(datingKeys.matches, (old) => old?.filter((m) => m.id !== matchId));
      qc.invalidateQueries({ queryKey: datingKeys.matches });
      qc.invalidateQueries({ queryKey: datingKeys.conversations });
      qc.invalidateQueries({ queryKey: datingKeys.likes });
    },
  });
}

// ---- chat -------------------------------------------------------------------

export function useConversations() {
  return useQuery({
    queryKey: datingKeys.conversations,
    queryFn: () => datingApi.conversations(),
    refetchInterval: 15_000,
  });
}

/** Messages newest-first pages; the screen renders them inverted. */
export function useConversationMessages(id: string | undefined) {
  return useInfiniteQuery({
    queryKey: datingKeys.messages(id || ''),
    enabled: Boolean(id),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => datingApi.messages(id!, pageParam, 50),
    getNextPageParam: (last) => (last.length < 50 ? undefined : last[last.length - 1]?.created_at),
  });
}

export function useSendMessage(conversationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => datingApi.sendMessage(conversationId!, body),
    onSuccess: (msg) => {
      const key = datingKeys.messages(conversationId || '');
      qc.setQueryData<{ pages: ChatMessage[][]; pageParams: unknown[] }>(key, (old) => {
        if (!old) return old;
        const [first = [], ...rest] = old.pages;
        return { ...old, pages: [[msg, ...first], ...rest] };
      });
      qc.invalidateQueries({ queryKey: datingKeys.conversations });
    },
  });
}

// ---- feed -------------------------------------------------------------------

const FEED_PAGE = 20;

export function useFeed(mode?: 'friends' | 'partner') {
  return useInfiniteQuery({
    queryKey: datingKeys.feed(mode),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => datingApi.feed({ mode, cursor: pageParam, limit: FEED_PAGE }),
    getNextPageParam: (last) => (last.length < FEED_PAGE ? undefined : last[last.length - 1]?.createdAt),
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { mode: 'friends' | 'partner'; category: string; question: string }) =>
      datingApi.createPost(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dating', 'feed'] }),
  });
}

export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => datingApi.toggleLike(postId),
    onSuccess: (res, postId) => {
      qc.setQueriesData<FeedPages>({ queryKey: ['dating', 'feed'] }, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((pg) =>
                pg.map((p) => (p.id === postId ? { ...p, likedByMe: res.liked, likeCount: res.likeCount } : p)),
              ),
            }
          : old,
      );
    },
  });
}

export function useComments(postId: string | undefined) {
  return useQuery({
    queryKey: datingKeys.comments(postId || ''),
    queryFn: () => datingApi.comments(postId!),
    enabled: Boolean(postId),
  });
}

export function useAddComment(postId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => datingApi.addComment(postId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: datingKeys.comments(postId || '') });
      qc.invalidateQueries({ queryKey: ['dating', 'feed'] });
    },
  });
}

// ---- safety -----------------------------------------------------------------

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => datingApi.block(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: datingKeys.all });
    },
  });
}

export function useUnblockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => datingApi.unblock(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: datingKeys.blocked });
      qc.invalidateQueries({ queryKey: ['dating', 'discover'] });
      qc.invalidateQueries({ queryKey: datingKeys.deck });
    },
  });
}

export function useReportUser() {
  return useMutation({
    mutationFn: (v: { userId: string; reason: string; details?: string }) =>
      datingApi.report(v.userId, v.reason, v.details),
  });
}
