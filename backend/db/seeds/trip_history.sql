-- Seed: 30-day trip history for reliability badge tiers

-- HIGH reliability — GREEN badge (~93% on time) — Intercity Express #1001
DO $$
DECLARE sch_id INTEGER; i INTEGER;
BEGIN
  SELECT id INTO sch_id FROM schedules WHERE train_number = '1001' LIMIT 1;
  IF sch_id IS NOT NULL THEN
    FOR i IN 0..29 LOOP
      INSERT INTO trip_status_updates (schedule_id, trip_date, status, delay_minutes, updated_at)
      VALUES (sch_id, CURRENT_DATE - i,
        CASE WHEN i IN (5, 17) THEN 'DELAYED' ELSE 'ON_TIME' END,
        CASE WHEN i IN (5, 17) THEN 15 ELSE 0 END,
        NOW() - (i || ' days')::INTERVAL)
      ON CONFLICT (schedule_id, trip_date) DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- MEDIUM reliability — YELLOW badge (~67% on time) — Udarata Menike #1003
DO $$
DECLARE sch_id INTEGER; i INTEGER;
BEGIN
  SELECT id INTO sch_id FROM schedules WHERE train_number = '1003' LIMIT 1;
  IF sch_id IS NOT NULL THEN
    FOR i IN 0..29 LOOP
      INSERT INTO trip_status_updates (schedule_id, trip_date, status, delay_minutes, updated_at)
      VALUES (sch_id, CURRENT_DATE - i,
        CASE WHEN i % 3 = 0 THEN 'DELAYED' ELSE 'ON_TIME' END,
        CASE WHEN i % 3 = 0 THEN (10 + (i % 20)) ELSE 0 END,
        NOW() - (i || ' days')::INTERVAL)
      ON CONFLICT (schedule_id, trip_date) DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- LOW reliability — RED badge (~33% on time) — Night Mail #4051
DO $$
DECLARE sch_id INTEGER; i INTEGER;
BEGIN
  SELECT id INTO sch_id FROM schedules WHERE train_number = '4051' LIMIT 1;
  IF sch_id IS NOT NULL THEN
    FOR i IN 0..29 LOOP
      INSERT INTO trip_status_updates (schedule_id, trip_date, status, delay_minutes, updated_at)
      VALUES (sch_id, CURRENT_DATE - i,
        CASE WHEN i % 3 < 2 THEN 'DELAYED' ELSE 'ON_TIME' END,
        CASE WHEN i % 3 < 2 THEN (20 + (i % 40)) ELSE 0 END,
        NOW() - (i || ' days')::INTERVAL)
      ON CONFLICT (schedule_id, trip_date) DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- MEDIUM-HIGH reliability (~80% on time) — Ruhunu Kumari #8701
DO $$
DECLARE sch_id INTEGER; i INTEGER;
BEGIN
  SELECT id INTO sch_id FROM schedules WHERE train_number = '8701' LIMIT 1;
  IF sch_id IS NOT NULL THEN
    FOR i IN 0..29 LOOP
      INSERT INTO trip_status_updates (schedule_id, trip_date, status, delay_minutes, updated_at)
      VALUES (sch_id, CURRENT_DATE - i,
        CASE WHEN i IN (2,8,11,19,22,28) THEN 'DELAYED' ELSE 'ON_TIME' END,
        CASE WHEN i IN (2,8,11,19,22,28) THEN 12 ELSE 0 END,
        NOW() - (i || ' days')::INTERVAL)
      ON CONFLICT (schedule_id, trip_date) DO NOTHING;
    END LOOP;
  END IF;
END $$;
