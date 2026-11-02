# Runbook: secrets and their expiry

Names only. No value is ever written here or committed.

| Where | Name | Used by | Expiry | How to renew |
| --- | --- | --- | --- | --- |
| Pages project `diego-portfolio-ai`, secret | `FLY_READONLY_TOKEN` | `/api/status`, `/api/runs/latest` (read machine state) | Fly token, created 2026-10-31 with a 90-day life, so before 2027-01-29 | create a new read-only Fly token of the same kind (the exact `fly tokens` subcommand was not re-verified here), then `wrangler pages secret put FLY_READONLY_TOKEN --project-name diego-portfolio-ai` |
| Pages project, secret | `FLY_WAKE_TOKEN` | `/api/demo/start` (start machines after the human check) | same | same, name `FLY_WAKE_TOKEN` |
| Cost guard Worker, secret | `FLY_STOP_TOKEN` | stops machines at the ceiling | same | `wrangler secret put FLY_STOP_TOKEN` in `worker/cost-guard` |
| Pages project, secret | `TURNSTILE_SECRET` | server-side check of the challenge | none set | Cloudflare dashboard, Turnstile, rotate secret, then `wrangler pages secret put TURNSTILE_SECRET` |
| Pages project, variable | `TURNSTILE_SITE_KEY` | the widget on `/demo/` | none | public value; keep equal to the widget |
| Pages project, secret | `DEMO_ACCOUNTS` | demo accounts shown to visitors | none | published on purpose by `/api/status`; change with the identity provider |

The lab `.env` keeps a local copy under the names `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`. The code reads `TURNSTILE_SECRET`, so copy the value across when you set the Pages secret. `.env` is ignored by Git.

Check after any change: `curl -s https://diego-portfolio-ai.pages.dev/api/status` must show `startAvailable: true` and the site key of the widget; the public e2e (`playwright.public.config.ts`) must pass.

When a token expires the symptom is `startAvailable: false` or a stopped guard (the budget in `/api/status` stops updating). Renew first, then redeploy nothing: secrets apply to the next request.
