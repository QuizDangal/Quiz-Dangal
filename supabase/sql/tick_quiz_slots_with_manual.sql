-- ============================================================
-- Enhanced tick_quiz_slots function
-- Now also handles manual quizzes (without slot_id)
-- ============================================================

CREATE OR REPLACE FUNCTION public.tick_quiz_slots()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now_tz timestamptz := now();
  v_activated int := 0;
  v_finished int := 0;
  v_skipped int := 0;
  v_quizzes_created int := 0;
  v_deleted int := 0;
  v_results_computed int := 0;
  v_manual_finished int := 0;
  rec record;
  new_question_id uuid;
  q_rec record;
  opt_rec record;
  v_question_text text;
  v_option_text text;
  v_is_correct boolean;
  v_new_quiz_id uuid;
BEGIN
  -- ========================================
  -- STEP A: Create quizzes 5 minutes before start (slot-based)
  -- ========================================
  FOR rec IN
    SELECT s.*
    FROM quiz_slots s
    LEFT JOIN quizzes q ON q.slot_id = s.id
    LEFT JOIN category_runtime_overrides o ON s.category = o.category
    WHERE s.status = 'scheduled'
      AND s.start_timestamp IS NOT NULL
      AND s.end_timestamp IS NOT NULL
      AND s.start_timestamp <= v_now_tz + interval '5 minutes'
      AND s.end_timestamp > v_now_tz
      AND (o.is_auto IS NULL OR o.is_auto = true)
      AND q.id IS NULL
  LOOP
    v_new_quiz_id := gen_random_uuid();
    
    INSERT INTO quizzes (id, slot_id, title, status, category, prizes, prize_type, start_time, end_time, created_at)
    VALUES (
      v_new_quiz_id,
      rec.id,
      rec.quiz_title,
      'upcoming',
      rec.category,
      rec.prizes,
      'coins',
      rec.start_timestamp,
      rec.end_timestamp,
      NOW()
    );
    
    IF rec.questions IS NOT NULL AND jsonb_typeof(rec.questions) = 'array' THEN
      FOR q_rec IN SELECT * FROM jsonb_array_elements(rec.questions)
      LOOP
        v_question_text := COALESCE(
          q_rec.value->>'question_text',
          q_rec.value->>'text',
          ''
        );
        
        IF v_question_text = '' OR length(v_question_text) < 3 THEN
          CONTINUE;
        END IF;
        
        new_question_id := gen_random_uuid();
        
        INSERT INTO questions (id, quiz_id, question_text, created_at)
        VALUES (new_question_id, v_new_quiz_id, v_question_text, now());
        
        IF q_rec.value->'options' IS NOT NULL AND jsonb_typeof(q_rec.value->'options') = 'array' THEN
          FOR opt_rec IN SELECT value, ordinality FROM jsonb_array_elements(q_rec.value->'options') WITH ORDINALITY
          LOOP
            v_option_text := COALESCE(
              opt_rec.value->>'option_text',
              opt_rec.value->>'text',
              opt_rec.value::text
            );
            
            IF v_option_text LIKE '"%"' THEN
              v_option_text := trim(both '"' from v_option_text);
            END IF;
            
            IF v_option_text = '' OR v_option_text = 'null' THEN
              CONTINUE;
            END IF;
            
            v_is_correct := COALESCE(
              (opt_rec.value->>'is_correct')::boolean,
              (opt_rec.value->>'correct')::boolean,
              false
            );
            
            INSERT INTO options (id, question_id, option_text, is_correct)
            VALUES (gen_random_uuid(), new_question_id, v_option_text, v_is_correct);
          END LOOP;
        END IF;
      END LOOP;
    END IF;
    
    v_quizzes_created := v_quizzes_created + 1;
  END LOOP;

  -- ========================================
  -- STEP B: Skip activation for paused categories
  -- ========================================
  WITH skipped AS (
    UPDATE quiz_slots s
    SET status = 'skipped'
    FROM category_runtime_overrides o
    WHERE s.category = o.category
      AND o.is_auto = false
      AND s.status = 'scheduled'
      AND s.end_timestamp < v_now_tz
    RETURNING s.id
  )
  SELECT COUNT(*) INTO v_skipped FROM skipped;

  -- ========================================
  -- STEP C: Activate slots that should be live now
  -- ========================================
  FOR rec IN
    SELECT s.*
    FROM quiz_slots s
    LEFT JOIN category_runtime_overrides o ON s.category = o.category
    WHERE s.status = 'scheduled'
      AND s.start_timestamp IS NOT NULL
      AND s.end_timestamp IS NOT NULL
      AND s.start_timestamp <= v_now_tz
      AND s.end_timestamp > v_now_tz
      AND (o.is_auto IS NULL OR o.is_auto = true)
  LOOP
    UPDATE quiz_slots SET status = 'active' WHERE id = rec.id;
    v_activated := v_activated + 1;
    
    UPDATE quizzes 
    SET status = 'active', updated_at = now()
    WHERE slot_id = rec.id;
  END LOOP;

  -- ========================================
  -- STEP D: Finish slots that have ended AND compute results
  -- ========================================
  FOR rec IN
    SELECT s.id as slot_id, q.id as quiz_id
    FROM quiz_slots s
    INNER JOIN quizzes q ON q.slot_id = s.id
    WHERE s.status IN ('active', 'live', 'scheduled')
      AND s.end_timestamp <= v_now_tz
  LOOP
    UPDATE quiz_slots SET status = 'finished' WHERE id = rec.slot_id;
    v_finished := v_finished + 1;
    
    UPDATE quizzes 
    SET status = 'completed', updated_at = now()
    WHERE id = rec.quiz_id AND status != 'completed';
    
    BEGIN
      PERFORM public.compute_results_if_due(rec.quiz_id);
      v_results_computed := v_results_computed + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Result computation failed for quiz %: %', rec.quiz_id, SQLERRM;
    END;
  END LOOP;

  -- ========================================
  -- STEP E: Handle MANUAL quizzes (no slot_id) - activate and finish them
  -- ========================================
  -- Activate manual quizzes that should be active
  UPDATE quizzes
  SET status = 'active', updated_at = now()
  WHERE slot_id IS NULL
    AND status = 'upcoming'
    AND start_time IS NOT NULL
    AND end_time IS NOT NULL
    AND start_time <= v_now_tz
    AND end_time > v_now_tz;

  -- Finish manual quizzes that have ended and compute results
  FOR rec IN
    SELECT q.id as quiz_id
    FROM quizzes q
    LEFT JOIN quiz_results qr ON qr.quiz_id = q.id
    WHERE q.slot_id IS NULL
      AND q.status IN ('upcoming', 'active')
      AND q.end_time IS NOT NULL
      AND q.end_time <= v_now_tz
  LOOP
    UPDATE quizzes 
    SET status = 'completed', updated_at = now()
    WHERE id = rec.quiz_id AND status != 'completed';
    
    v_manual_finished := v_manual_finished + 1;
    
    BEGIN
      PERFORM public.compute_results_if_due(rec.quiz_id);
      v_results_computed := v_results_computed + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Result computation failed for manual quiz %: %', rec.quiz_id, SQLERRM;
    END;
  END LOOP;

  -- ========================================
  -- STEP F: Auto-delete old quizzes (4 days old)
  -- ========================================
  WITH deleted_quizzes AS (
    DELETE FROM quizzes
    WHERE status = 'completed'
      AND end_time < v_now_tz - interval '4 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted_quizzes;
  
  DELETE FROM quiz_slots
  WHERE status IN ('finished', 'skipped')
    AND end_timestamp < v_now_tz - interval '4 days';

  RETURN jsonb_build_object(
    'quizzes_created', v_quizzes_created,
    'activated', v_activated,
    'finished', v_finished,
    'manual_finished', v_manual_finished,
    'results_computed', v_results_computed,
    'skipped', v_skipped,
    'deleted', v_deleted,
    'run_at', v_now_tz
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.tick_quiz_slots() TO service_role;
