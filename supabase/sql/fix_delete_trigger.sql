-- Fix trg_prevent_delete_active_quiz to allow SECURITY DEFINER functions to delete old quizzes
-- This fixes the "unauthorized" error in tick_quiz_slots

CREATE OR REPLACE FUNCTION public.trg_prevent_delete_active_quiz()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
begin
  -- Allow SECURITY DEFINER functions (like tick_quiz_slots) to delete old completed quizzes
  -- Check if current user is postgres (SECURITY DEFINER context)
  if current_user = 'postgres' then
    -- Allow delete of completed quizzes older than 4 days (cleanup)
    if old.status = 'completed' and old.end_time < now() - interval '4 days' then
      return old;
    end if;
    -- Allow delete of upcoming quizzes by system (rare admin cleanup)
    if old.start_time is not null and now() < old.start_time then
      return old;
    end if;
  end if;
  
  -- For normal user operations, require auth
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;
  
  -- Check admin
  if not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'only admins may delete quizzes';
  end if;
  
  -- Block if start_time reached/past
  if old.start_time is not null and now() >= old.start_time then
    raise exception 'cannot delete after quiz has started';
  end if;
  
  return old;
end;$$;
