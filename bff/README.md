# Palora BFF

Actix-web + sqlx (Postgres) + optional Redis. Migrations run automatically on boot.

```bash
cp .env.example .env
createdb auth_kit          # once
cargo run                   # GET http://127.0.0.1:8000/api/v1/health
cargo test                  # unit tests (match score, phone normalisation, birthday parsing)
```

Config: `configuration.yaml` overridden by `BFF__SECTION__KEY` env vars (see `.env.example`).
Photos are written to `storage.dir` (default `uploads/`) and served from `/media`.
Providers (`sms`, `email`, `push`, `oauth.google`) are no-ops/logs until configured.

Docker: `Dockerfile` is a two-stage build; runtime image has `curl` for the compose healthcheck.
See `../compose.prod.yml` and `../scripts/vps-deploy.sh` for the VPS rollout.
