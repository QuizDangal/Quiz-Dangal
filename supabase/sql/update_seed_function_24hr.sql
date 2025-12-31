-- ============================================================
-- Updated admin_seed_quiz_day_multi for 24-hour schedule
-- Changed: Start hour 8 → 0, Max quizzes 96 → 144
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_seed_quiz_day_multi(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_target_date date;
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date;
  v_max_date date := v_today + INTERVAL '2 days';
  v_categories jsonb;
  v_cat text;
  v_slots jsonb;
  v_slot jsonb;
  v_time text;
  v_count int;
  v_batch_id uuid;
  v_quiz_interval_minutes int := 10;
  v_expected_times text[];
  v_h int;
  v_m int;
  v_slot_time time;
  v_inserted int := 0;
BEGIN
  -- Admin check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  -- Generate expected times array (00:00 to 23:50, every 10 min) - 24 hour schedule
  v_expected_times := ARRAY[]::text[];
  v_h := 0; v_m := 0;
  WHILE v_h < 24 LOOP
    v_expected_times := array_append(v_expected_times, lpad(v_h::text, 2, '0') || ':' || lpad(v_m::text, 2, '0'));
    v_m := v_m + v_quiz_interval_minutes;
    IF v_m >= 60 THEN v_h := v_h + 1; v_m := v_m - 60; END IF;
  END LOOP;

  -- Validate target_date
  v_target_date := (p_payload->>'target_date')::date;
  IF v_target_date IS NULL THEN RAISE EXCEPTION 'target_date missing'; END IF;
  IF v_target_date < v_today THEN RAISE EXCEPTION 'Cannot deploy for past dates'; END IF;
  IF v_target_date > v_max_date THEN RAISE EXCEPTION 'Max 3 days advance'; END IF;

  v_categories := p_payload->'categories';
  IF v_categories IS NULL THEN RAISE EXCEPTION 'categories missing'; END IF;

  -- Process each category
  FOR v_cat IN SELECT jsonb_object_keys(v_categories) LOOP
    v_slots := v_categories->v_cat;
    v_count := jsonb_array_length(v_slots);
    IF v_count > 144 OR v_count < 1 THEN RAISE EXCEPTION 'Need 1-144 quizzes per category'; END IF;

    -- Create or update batch record
    INSERT INTO public.quiz_day_batches(target_date, category, seed_source)
    VALUES (v_target_date, v_cat, 'bulk')
    ON CONFLICT (target_date, category) DO UPDATE SET status='reseeded', updated_at = now()
    RETURNING id INTO v_batch_id;

    -- Clear existing slots for this date/category
    DELETE FROM public.quiz_slots WHERE target_date = v_target_date AND category = v_cat;

    -- Insert new slots
    -- NOTE: start_timestamp and end_timestamp are GENERATED ALWAYS columns
    -- They are auto-calculated from: target_date + slot_time AT TIME ZONE 'Asia/Kolkata'
    FOR v_slot IN SELECT * FROM jsonb_array_elements(v_slots) LOOP
      v_time := v_slot->>'time';
      IF NOT (v_time = ANY(v_expected_times)) THEN RAISE EXCEPTION 'Invalid time %', v_time; END IF;

      -- Parse slot time
      v_slot_time := (v_time || ':00')::time;

      INSERT INTO public.quiz_slots(
        batch_id, 
        category, 
        target_date, 
        slot_time, 
        -- start_timestamp and end_timestamp are auto-generated!
        quiz_title, 
        prizes, 
        questions, 
        status
      )
      VALUES (
        v_batch_id, 
        v_cat, 
        v_target_date, 
        v_slot_time,
        COALESCE(v_slot->>'title', 'Quiz'),
        COALESCE((v_slot->'prizes')::jsonb, '[121,71,51]'::jsonb),
        (v_slot->'questions')::jsonb, 
        'scheduled'
      );
      
      v_inserted := v_inserted + 1;
    END LOOP;
  END LOOP;

  -- Ensure category auto is enabled
  INSERT INTO public.category_runtime_overrides(category, is_auto)
  SELECT DISTINCT cat, true FROM jsonb_object_keys(v_categories) AS cat
  ON CONFLICT (category) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'date', v_target_date, 'slots_created', v_inserted);
END;
$function$;
