# Palora

Meet people around you — friends or partners. Expo (React Native) app + Rust BFF.

Layout

- `app/` Expo Router client (Expo SDK 56, NativeWind, TanStack Query, Reanimated)
- `bff/` Actix-web modular monolith: auth, profiles, discover, matching, chat, feed, safety
- `compose.base.yml` + `compose.dev.yml` local Postgres/Redis/BFF
- `compose.prod.yml` + `scripts/vps-deploy.sh` + `deploy/nginx.palora.conf` VPS deploy
- `ARCHITECTURE.md` how the pieces fit, data model, API surface

## Run locally

Backend (needs Postgres on 5432, Redis optional):

```bash
cd apps/palora/bff
cp .env.example .env            # fill Google client id/secret if you want Google login
createdb auth_kit               # once; migrations run on boot
cargo run                        # http://127.0.0.1:8000/api/v1/health
```

Or everything in Docker: `docker compose -f compose.base.yml -f compose.dev.yml up --build`
(BFF on 8000, Postgres on 5433, Redis on 6380).

App on a USB Android device (clean, install the dev client, then Metro over adb). Full notes: `docs/android.md`.

```bash
cd apps/palora/app
bun install
bun run android:clean
bun run android:install:adb
bun run dev:android-adb:clear    # Metro over adb reverse (BFF on 127.0.0.1:8000)
```

Demo accounts (seeded by migrations 004 and 005, password `demo1234`): `demo1@friendzy.local` … `demo24@friendzy.local`,
mostly Bengaluru plus Mumbai, Pune, Delhi, Hyderabad, Chennai, Mysuru. Phone login in dev accepts OTP `123456`.

Log in as `demo1@friendzy.local` (Halima) to see every state at once: 5 matches (two with unread replies, two with no
messages yet), 6 people who liked her, a swipe deck of ~8 nearby profiles, 3 photos, and a feed with likes and comments.
Every table has rows, including blocks, reports, an unmatched pair, push devices and sessions.
Remove all demo data with `DELETE FROM auth.users WHERE email LIKE 'demo%@friendzy.local';`

In dev, if the BFF is unreachable the app shows sample data with a yellow banner instead of failing.

## Release checklist (Android)

1. `bun run keystore` once, then put the `PALORA_UPLOAD_*` values in `~/.gradle/gradle.properties`.
2. Bump `versionCode`/`versionName` in `android/app/build.gradle` and `version`/`versionCode` in `app.config.js`.
3. `EXPO_PUBLIC_BFF_API_URL=https://api.palora.kraftisium.com bun run android:bundle`
4. Upload `android/app/build/outputs/bundle/release/app-release.aab` to Play.
   Privacy policy URL: `https://api.palora.kraftisium.com/api/v1/legal/privacy`.
   Data safety: name, email/phone, birthday, approximate location, photos, messages; account deletion in-app (Profile → Delete account).

## Deploy the BFF

```bash
cp bff/.env.prod.example bff/.env.prod   # on first run the script copies it to the VPS for you to fill in
apps/palora/scripts/vps-deploy.sh --tag v0.2.0
```

The image is built locally (VPS has 4 GB RAM), shipped over ssh, and rolled out with `compose.prod.yml`
(fixed container IPs because Docker DNS is broken on that box; BFF on host port 8010; nginx terminates TLS —
see `deploy/nginx.palora.conf`). Keep Turnstile off: the mobile app cannot render the widget.

## Configuration

All BFF settings live in `bff/configuration.yaml` and can be overridden with `BFF__SECTION__KEY` env vars.
New sections in this release: `storage` (photo dir / public URL / max MB), `sms` (`dev`, `msg91`, `twilio`),
`push` (Expo push), `rate_limit`, `legal`. See `bff/.env.example` for every key.
