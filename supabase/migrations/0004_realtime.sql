-- Postgres change events are only broadcast for tables explicitly added to
-- this publication. Needed so NotificationBell can subscribe to new rows
-- instead of polling.
alter publication supabase_realtime add table public.notifications;
