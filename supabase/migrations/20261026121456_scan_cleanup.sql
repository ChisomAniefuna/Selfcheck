-- Supabase Cron removes expired app-held task references every minute.
-- Read access expires at 15 minutes; physical deletion normally follows within a minute.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule(
 'shelfcheck-expired-scans', '* * * * *',
 $$delete from public.scan_jobs where expires_at < now();$$
);
