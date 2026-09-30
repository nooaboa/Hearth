# Hearth operator desk

Staff UI for Hearth circles. It reads and writes Supabase, and it starts n8n webhooks for launch, season invites, moving a meeting, dropping a member, and attendance.

The system around this app (workflows, tables, what is actually live) is documented in `../HEARTH_AS_BUILT.md`. That file is not in this git repo. This repo is the desk only: `https://github.com/Smew-AI/Hearth`.

## Run locally

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open the URL Next prints. Sign in with `OPERATOR_PASSWORD`.

| Variable | Required | Role |
| --- | --- | --- |
| `SUPABASE_URL` | yes | `https://dpeepkctugwabdgxlbmu.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Desk uses the service role and bypasses RLS. |
| `OPERATOR_PASSWORD` | yes | Cookie `hearth_operator` is an HMAC of this password. |
| `N8N_WEBHOOK_BASE` | no | Defaults to `https://n8n.srv922487.hstgr.cloud/webhook`. |

If the Supabase variables are missing, the home page shows a setup message and does not query.

## What the screens do

- **Home.** Meetings in the next two weeks, with who is in, out, or quiet.
- **Circles.** Create a circle (the form saves it as confirmed and adds the host to the roster). The pen reopens that form. Launch calls `hearth-launch-circle` for a new circle and `hearth-season-invites` for an existing one. The page polls for meetings for 90 seconds. The banner means n8n accepted the webhook, which happens before calendar work finishes.
- **People.** Member overview. Edit a person, record SMS consent (disclosure text is required), or delete them from a confirmation page.
- **Meeting.** Move one meeting, or record who was there.

A 404 from n8n is shown as “n8n has no active webhook for this yet.” Season invites and attendance are still in that state. Publish the workflow in n8n before expecting the button to do the work.

There is no deploy target in this repo.
