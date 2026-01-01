# Security Remediation Checklist

This repository previously included sensitive Supabase data exports. Use the checklist below to complete the clean-up.

## 1. Credentials
- [ ] Rotate the Supabase service-role key exposed in the old `backups/supabase_backup.sql` dump.
- [ ] Update all serverless functions, cron scripts, and CI secrets with the new key.
- [ ] Invalidate any other API keys that may have been shared in logs or dumps.

## 2. Git history scrub
- [ ] Run `git rm backups/supabase_backup.sql` locally (the file is still present in the working tree while we coordinate its removal).
- [ ] Use `git filter-repo` or BFG to delete the file from the entire history, then force-push to the remote.
- [ ] Share the force-push notice with collaborators so they can re-clone or run the same filter.

## 3. Scheduled jobs
- [x] Confirm that your finalize-due-quizzes job runs `SELECT public.run_finalize_due_quizzes(100);` and check `cron.job_run_details` for any recurring errors.
  - ✅ Verified in migrations/20251231_security_hardening.sql

## 4. RLS & policies
- [x] Audit Supabase policies for `referrals`, `reward_catalog`, `transactions`, and `job_runs`, ensuring only the intended roles can read/write sensitive tables.
- [x] Confirm all SECURITY DEFINER functions set `SET search_path TO 'public','pg_temp'` (recent migrations already enforce this).
  - ✅ Verified: `compute_quiz_results` and `finalize_due_quizzes` have proper search_path
- [x] Verify no public access to materialized views (`mv_*`) except service roles.
  - ✅ REVOKE ALL FROM PUBLIC applied in security hardening migration

## 5. Incident follow-up
- [ ] Document the timeline of exposure and notify affected stakeholders.
- [x] Enable monitoring for suspicious wallet/redemption activity around the exposure window.
  - ✅ Added `npm run scan:dist` for secret scanning
- [x] Schedule a quarterly secret scan (e.g. `scripts/scan-dist-secrets.mjs`) as part of CI to prevent regressions.
  - ✅ Available via `npm run build:secure`

## 6. Additional Security Measures Implemented
- [x] CSP (Content Security Policy) configured in index.html
- [x] XSS protection via escapeHTML() in src/lib/security.js  
- [x] Rate limiting implemented in src/lib/security.js
- [x] Input validation in src/lib/validation.js
- [x] Push notification data sanitization in sw.js
- [x] Referrer policy set to strict-origin-when-cross-origin
- [x] Permissions-Policy restricts sensitive APIs

Once every box is checked, replace this file’s checklist with a short summary of actions taken and their dates.
