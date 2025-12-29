# Supabase Edge Functions

This directory contains edge functions supporting scheduling & maintenance:

- `admin-upsert-questions` – bulk insert/replace quiz questions.
- `send-notifications` – push notification broadcast / reminder (future integration).
- `tick_quiz_slots` – POST every minute (external cron) processes slots starting this minute.
- `cleanup_slots` – POST daily purges batches older than 3 days.

Do NOT commit `supabase/.temp` or `supabase/.branches` folders — local CLI state.

## Scheduling (External Cron)

Invoke with POST requests:

```
https://<PROJECT_REF>.functions.supabase.co/tick_quiz_slots
https://<PROJECT_REF>.functions.supabase.co/cleanup_slots
```

Headers:
```
Authorization: Bearer <SERVICE_ROLE_KEY>
apikey: <SERVICE_ROLE_KEY>
```

Service role key must NEVER be exposed in client code.

## Environment Variables
```
SUPABASE_URL=https://<PROJECT_REF>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=... (secret)
```

## Purge Policy
`cleanup_slots` deletes data where target_date < (current_date - 3). Uses RPC `purge_old_slots`.

## Seeding
`admin_seed_quiz_day_multi` enforces 144 slots (00:00–23:50, 10-min cadence, 24-hour) per category.
