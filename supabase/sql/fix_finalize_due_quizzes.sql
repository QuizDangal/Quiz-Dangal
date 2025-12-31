-- Fix finalize_due_quizzes to also process quizzes that are already 'completed' but missing results

CREATE OR REPLACE FUNCTION public.finalize_due_quizzes(p_limit int DEFAULT 50)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid       uuid := (SELECT auth.uid());
  v_processed int  := 0;
  v_failed    int  := 0;
  v_limit     int  := GREATEST(COALESCE(p_limit, 50), 1);
  rec record;
BEGIN
  IF v_uid IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF NOT pg_try_advisory_xact_lock(hashtext('finalize_due_quizzes_v4')) THEN
    RETURN 0;
  END IF;

  -- Process quizzes that have ended but not yet completed
  FOR rec IN
    SELECT q.id
    FROM public.quizzes q
    WHERE q.end_time IS NOT NULL AND q.end_time <= now()
      AND q.status IN ('upcoming', 'active', 'finished')
    ORDER BY q.end_time, q.id
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      PERFORM public.compute_results_if_due(rec.id);
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      RAISE NOTICE 'Finalize failed for quiz %: %', rec.id, SQLERRM;
    END;
  END LOOP;

  -- ALSO process completed quizzes that are missing results (safety net)
  FOR rec IN
    SELECT q.id
    FROM public.quizzes q
    LEFT JOIN public.quiz_results qr ON qr.quiz_id = q.id
    WHERE q.end_time IS NOT NULL AND q.end_time <= now()
      AND q.status = 'completed'
      AND (qr.id IS NULL OR jsonb_array_length(COALESCE(qr.leaderboard, '[]'::jsonb)) = 0)
      AND EXISTS (SELECT 1 FROM public.questions WHERE quiz_id = q.id)  -- Has questions
    ORDER BY q.end_time DESC
    LIMIT v_limit
    FOR UPDATE OF q SKIP LOCKED
  LOOP
    BEGIN
      PERFORM public.compute_quiz_results(rec.id);
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      RAISE NOTICE 'Compute results failed for completed quiz %: %', rec.id, SQLERRM;
    END;
  END LOOP;

  IF v_failed > 0 THEN
    RAISE NOTICE 'Finalize batch finished with % successes and % failures',
                 v_processed, v_failed;
  END IF;

  RETURN v_processed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_due_quizzes(int) TO service_role;

-- SECURITY: minimize exposed surface; only service_role should run this batch finalizer.
REVOKE ALL ON FUNCTION public.finalize_due_quizzes(int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_due_quizzes(int) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_due_quizzes(int) TO service_role;
