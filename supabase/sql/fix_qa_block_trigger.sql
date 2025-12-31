-- Fix trg_block_qa_after_start to allow SECURITY DEFINER functions to create new quizzes with questions
-- This fixes the "Quiz has started; editing questions/options is locked" error in tick_quiz_slots

CREATE OR REPLACE FUNCTION public.trg_block_qa_after_start()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
declare
  v_quiz_id uuid;
  v_start timestamptz;
begin
  -- Allow SECURITY DEFINER functions (like tick_quiz_slots running as postgres)
  -- to insert new questions/options even after quiz start time
  -- This is needed because tick runs right around start time
  if current_user = 'postgres' then
    return COALESCE(NEW, OLD);
  end if;

  -- Determine quiz_id depending on table
  if TG_TABLE_NAME = 'questions' then
    v_quiz_id := coalesce(NEW.quiz_id, OLD.quiz_id);
  elsif TG_TABLE_NAME = 'options' then
    select q.quiz_id into v_quiz_id from public.questions q where q.id = coalesce(NEW.question_id, OLD.question_id);
  else
    return NEW; -- not expected
  end if;

  if v_quiz_id is null then
    return NEW;
  end if;

  select start_time into v_start from public.quizzes where id = v_quiz_id;
  if v_start is not null and now() >= v_start then
    raise exception 'Quiz has started; editing questions/options is locked';
  end if;

  return COALESCE(NEW, OLD);
end;$$;
