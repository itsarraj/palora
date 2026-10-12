# Palora architecture

Expo Router client + Actix-web BFF over Postgres (schemas `auth`, `dating`) with optional Redis.
Grew out of the reusable auth kit; auth is untouched, everything under `dating` is new.

## Layout

- `bff/src/module/auth` register/login/refresh/logout, email verify, password reset, Google OAuth, phone OTP
- `bff/src/module/dating` profiles, photos, discover, swipes/matches, chat, feed, blocks/reports, account deletion
- `bff/src/module/{storage,sms,push,email,legal}` provider adapters, all config-gated so local dev needs no credentials
- `bff/src/middleware` JWT extractor with jti blacklist, fixed-window rate limiter, CORS
- `app/app` Expo Router routes; `(app)/` is the authenticated tab group
- `app/services` fetch wrappers (`authApi`, `datingApi`), `app/hooks` TanStack Query hooks, `app/components/palora` UI

## Data model (migration 004)

- `dating.profiles` one row per `auth.users` row, created at signup. gender, `looking_for[]`, intent (friends/partner/both), birthday → age, city/country, lat/lng, interests, age range, max distance, `onboarding_complete`, `last_active_at`, `deleted_at`
- `dating.photos` up to 6 per user, ordered by `position`; stored on local disk under `storage.dir`, served at `/media`
- `dating.swipes` (from, to, like/pass/superlike) unique per pair
- `dating.matches` created when both sides liked; `user_a < user_b`; `unmatched_at` soft-delete
- `dating.conversations` exactly one per match; `dating.messages` with `sender_id`; `dating.message_reads` for unread markers
- `dating.blocks`, `dating.reports`
- `dating.feed_posts` (mode friends/partner, category, question), `post_likes`, `post_comments`
- `dating.devices` Expo push tokens
- `dating.phone_otps` hashed OTPs with attempt counter

Discover excludes: self, anyone already swiped, blocked in either direction, deleted, incomplete onboarding, outside the viewer's age/distance/gender preferences. Distance is a haversine in SQL from the viewer's lat/lng; `match_percent` = shared-interest ratio plus an intent bonus (unit-tested).

### Mode: Friends | Dating

The app has one browsing mode, chosen on Home and persisted on the device (`app/lib/mode.ts`). It is the same axis as the profile `intent` (friends / partner / both), which is what a person is open to; the mode is what the viewer is browsing right now.

- Home feed: `GET /feed?mode=` shows prompts posted in that mode. Each post carries `relation` (self / matched / liked / none) and `conversationId`, so the card can offer Connect → Sent → Message without extra requests.
- Swipe deck: `GET /discover/nearby?intent=` returns people whose intent is that mode or `both`. Without the param it falls back to the viewer's own intent.
- `POST /swipe` accepts an optional `mode`, stored on `dating.swipes.mode` (migration 006). Push copy changes with it ("You're connected" vs "It's a match"). Matches and conversations remain a single table regardless of mode.
- Connecting from a feed card is the same swipe-like on the author; a mutual like opens the same MatchModal as the deck.

## API surface (`/api/v1`)

Auth: `POST /auth/{register,login,refresh,logout,phone/start,phone/verify,google,password-reset,password-reset/confirm}`, `GET /auth/google`, `GET /auth/google/callback`, `GET|POST /auth/verify-email`.

Self: `GET|PATCH /user/profile`, `POST /user/profile/location`, `POST /user/profile/photos` (multipart `file`), `POST /user/profile/photos/reorder`, `DELETE /user/profile/photos/{id}`, `POST|DELETE /user/devices`, `GET /user/blocked`, `POST /user/change-password`, `GET /user/me`, `DELETE /user/me`.

Dating: `GET /stories`, `GET /discover/nearby?interest&limit&offset&max_km`, `GET /discover/people/{id}`, `POST /swipe`, `GET /likes`, `GET /matches`, `DELETE /matches/{id}`, `GET /messages/conversations`, `GET|POST /messages/conversations/{id}` (`?before&limit`, newest first), `GET|POST /feed`, `POST /feed/{id}/like`, `GET|POST /feed/{id}/comments`, `POST|DELETE /users/{id}/block`, `POST /users/{id}/report`.

Public: `GET /health`, `GET /legal/privacy`, `GET /legal/terms`, static `/media/*`.

## Auth and safety

- Access JWT (24 h) with `jti`; logout writes the jti to `auth.token_blacklist` and Redis; the extractor rejects revoked tokens
- Refresh tokens rotate; hashes only in DB
- Rate limiter: 10/min on auth endpoints, 240/min elsewhere, keyed by token or `X-Forwarded-For`/peer IP, Redis-backed with in-memory fallback
- Phone OTP: 10 min TTL, 5 attempts, 30 s resend throttle; `dev` provider logs the code and accepts `123456`
- Uploads: magic-byte sniffing (jpg/png/webp/heic), size cap, per-user directories, `actix-files` with no directory listing
- Blocking removes the match and conversation for both parties; account deletion deletes photos and the `auth.users` row (cascades)

## Client

- Tokens only in SecureStore; TanStack Query for everything else; single-flight refresh on 401
- `(app)/_layout.tsx` gates on session → profile → `onboarding_complete`; `/onboarding` is a 4-step form that saves each step
- Swipe deck (`create.tsx`) and full profile (`profile/[id].tsx`) share `SwipeCard` (Reanimated + gesture-handler; `scheduleOnRN` for JS callbacks); mutual likes open `MatchModal`
- Lists use `FlashList` v2 / `FlatList` with pull-to-refresh and pagination (`useInfiniteQuery`); chat is an inverted list polling every 5 s
- Dev only: network failures fall back to fixtures and show `OfflineBanner`; HTTP errors are never masked
- Push: `expo-notifications` token → `POST /user/devices`; BFF sends via Expo push API on new match / message and prunes `DeviceNotRegistered`

## Performance baseline

Client: `refetchOnWindowFocus: false`, `staleTime` 60 s, retry 1; images via RN `Image` with URL sources; no AsyncStorage session.
BFF: pooled Postgres (10), indexed swipes/matches/messages/(conversation_id, created_at), cheap `/health`, bcrypt only on register/login.

## Local run

```bash
cd bff && cargo run
cd app && bun install && bun run dev:android-adb
```
