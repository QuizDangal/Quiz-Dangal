-- Fix trigger to compute results for both 'finished' and 'completed' status
CREATE OR REPLACE FUNCTION public.trg_quizzes_status_compute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Compute results when quiz status changes to finished or completed
  IF tg_op = 'UPDATE' 
     AND NEW.status IN ('finished', 'completed') 
     AND OLD.status NOT IN ('finished', 'completed') THEN
    PERFORM public.compute_quiz_results(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Also add a trigger for quiz that finishes based on end_time
-- This will auto-compute when quiz is marked completed
