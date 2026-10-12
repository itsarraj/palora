// Shapes mirror the BFF JSON (bff/src/module/dating/model.rs).

export type Photo = { id: string; url: string; position: number };

export type StoryItem = { id: string; name: string; photoUrl?: string; isSelf?: boolean };

export type FeedPost = {
  id: string;
  category: string;
  question: string;
  mode: 'friends' | 'partner' | string;
  author: string;
  authorId: string;
  city: string;
  authorPhotoUrl?: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  /** Viewer's relation to the author: self | matched | liked | none. */
  relation?: 'self' | 'matched' | 'liked' | 'none' | string;
  conversationId?: string;
  createdAt: string;
};

export type FeedComment = {
  id: string;
  userId: string;
  name: string;
  body: string;
  mine: boolean;
  createdAt: string;
};

export type Person = {
  id: string;
  name: string;
  age: number;
  gender?: string;
  city: string;
  distanceKm?: number;
  isNew?: boolean;
  online?: boolean;
  interests: string[];
  about: string;
  intent: string;
  matchPercent: number;
  photos: Photo[];
  photoUrl?: string;
};

/** Kept for older imports. */
export type NearbyPerson = Person;

export type MatchItem = {
  id: string;
  conversationId: string;
  person: Person;
  createdAt: string;
};

export type LikesSummary = { received: number; matches: number; people: Person[] };

export type ConversationItem = {
  id: string;
  matchId: string;
  peerId: string;
  name: string;
  photoUrl?: string;
  preview: string;
  time: string;
  lastMessageAt: string;
  unread?: boolean;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  body: string;
  mine: boolean;
  created_at: string;
};

export type MyProfile = {
  user_id: string;
  display_name: string;
  gender: string | null;
  looking_for: string[];
  intent: 'friends' | 'partner' | 'both' | string;
  birthday: string | null;
  age: number | null;
  city: string;
  country: string;
  about: string;
  interests: string[];
  lat: number | null;
  lng: number | null;
  min_age: number;
  max_age: number;
  max_distance_km: number;
  onboarding_complete: boolean;
  email: string;
  phone: string | null;
  has_password: boolean;
  photos: Photo[];
};

export const INTERESTS = [
  '⚽️ Football',
  '🍃 Nature',
  '📸 Photography',
  '🎵 Music',
  '✍🏻 Writing',
  '🗣 Language',
  '👗 Fashion',
  '🏝 Travel',
  '🙂 People',
  '💪 Gym & Fitness',
  '🍜 Foodie',
  '🎬 Movies',
  '📚 Books',
  '🎮 Gaming',
  '🧘 Yoga',
  '🏏 Cricket',
];

export const GENDERS = [
  { id: 'woman', label: 'Woman' },
  { id: 'man', label: 'Man' },
  { id: 'nonbinary', label: 'Non-binary' },
  { id: 'other', label: 'Other' },
] as const;

export const INTENTS = [
  { id: 'friends', label: 'Make friends' },
  { id: 'partner', label: 'Find a partner' },
  { id: 'both', label: 'Open to both' },
] as const;

export const REPORT_REASONS = [
  'Fake profile or scam',
  'Inappropriate photos',
  'Harassment or bullying',
  'Underage',
  'Spam or advertising',
  'Something else',
];

/** Strip the leading emoji from an interest label. */
export function interestText(label: string): string {
  return label.replace(/^[^\p{L}\p{N}]+\s*/u, '').trim();
}

const av = (n: number) => `https://i.pravatar.cc/600?img=${n}`;
const photo = (id: string, n: number): Photo => ({ id, url: av(n), position: 0 });

function person(
  id: string,
  name: string,
  age: number,
  city: string,
  distanceKm: number,
  interests: string[],
  about: string,
  matchPercent: number,
  img: number,
  extra: Partial<Person> = {},
): Person {
  return {
    id,
    name,
    age,
    city,
    distanceKm,
    interests,
    about,
    intent: 'both',
    matchPercent,
    photos: [photo(`${id}-ph`, img)],
    photoUrl: av(img),
    ...extra,
  };
}

export const FIXTURE_NEARBY: Person[] = [
  person('p1', 'Aanya', 23, 'Mumbai', 3.2, ['🍃 Nature', '🏝 Travel', '✍🏻 Writing'], 'A good listener. Coffee walks and long talks.', 84, 47, { isNew: true, online: true }),
  person('p2', 'Kabir', 26, 'Mumbai', 6.8, ['🎵 Music', '📸 Photography'], 'Weekend gigs and street photography.', 72, 12, { isNew: true }),
  person('p3', 'Meera', 24, 'Pune', 11.5, ['⚽️ Football', '💪 Gym & Fitness'], 'Always up for a pickup game.', 91, 32, { online: true }),
  person('p4', 'Rohan', 27, 'Mumbai', 2.4, ['🗣 Language', '👗 Fashion'], 'Learning Spanish and collecting sneakers.', 66, 15, { isNew: true }),
  person('p5', 'Ishita', 22, 'Thane', 9.1, ['🍜 Foodie', '🎬 Movies', '📚 Books'], 'Film buff, will fight you about biryani.', 79, 45, { online: true }),
  person('p6', 'Dev', 25, 'Navi Mumbai', 14, ['🎮 Gaming', '🎵 Music'], 'DJ on weekends.', 88, 59),
];

export const FIXTURE_STORIES: StoryItem[] = [
  { id: 'self', name: 'You', isSelf: true },
  ...FIXTURE_NEARBY.slice(0, 4).map((p) => ({ id: p.id, name: p.name, photoUrl: p.photoUrl })),
];

export const FIXTURE_FEED: FeedPost[] = [
  {
    id: 'f1',
    category: '🏝 Travel',
    question: 'If you could live anywhere in the world, where would you pick?',
    mode: 'friends',
    author: 'Aanya',
    authorId: 'p1',
    city: 'Mumbai',
    authorPhotoUrl: av(47),
    likeCount: 12,
    commentCount: 3,
    likedByMe: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'f2',
    category: '⚽️ Football',
    question: 'Who is winning the league this season?',
    mode: 'friends',
    author: 'Meera',
    authorId: 'p3',
    city: 'Pune',
    authorPhotoUrl: av(32),
    likeCount: 5,
    commentCount: 1,
    likedByMe: true,
    createdAt: new Date().toISOString(),
  },
];

export const FIXTURE_MATCHES: MatchItem[] = FIXTURE_NEARBY.slice(2, 6).map((p, i) => ({
  id: `m${i + 1}`,
  conversationId: `c${i + 1}`,
  person: p,
  createdAt: new Date().toISOString(),
}));

export const FIXTURE_CONVERSATIONS: ConversationItem[] = FIXTURE_MATCHES.map((m, i) => ({
  id: m.conversationId,
  matchId: m.id,
  peerId: m.person.id,
  name: m.person.name,
  photoUrl: m.person.photoUrl,
  preview: i === 0 ? 'What about that new café near Bandra?' : 'Say hi 👋',
  time: '09:18',
  lastMessageAt: new Date().toISOString(),
  unread: i === 0,
}));

export const FIXTURE_PROFILE: MyProfile = {
  user_id: 'local',
  display_name: 'You',
  gender: null,
  looking_for: [],
  intent: 'both',
  birthday: null,
  age: null,
  city: '',
  country: 'India',
  about: '',
  interests: [],
  lat: null,
  lng: null,
  min_age: 18,
  max_age: 45,
  max_distance_km: 100,
  onboarding_complete: true,
  email: 'you@example.com',
  phone: null,
  has_password: true,
  photos: [],
};
