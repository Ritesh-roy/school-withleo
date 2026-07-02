
-- Trigger fn does not need elevated privs; run as caller.
CREATE OR REPLACE FUNCTION public.log_book_location_change()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.book_movements(book_id, event_type, actor_id, to_snapshot, remarks)
    VALUES (NEW.book_id, 'placed', NEW.updated_by, to_jsonb(NEW), 'Initial placement');
  ELSIF TG_OP = 'UPDATE' AND (OLD.rack_id IS DISTINCT FROM NEW.rack_id
        OR OLD.shelf_id IS DISTINCT FROM NEW.shelf_id) THEN
    INSERT INTO public.book_movements(book_id, event_type, actor_id, from_snapshot, to_snapshot, remarks)
    VALUES (NEW.book_id, 'transfer', NEW.updated_by, to_jsonb(OLD), to_jsonb(NEW), 'Location updated');
  END IF;
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.log_book_location_change() FROM PUBLIC, anon, authenticated;

-- View: rebuild with security_invoker so it respects caller's RLS.
DROP VIEW IF EXISTS public.rack_inventory;
CREATE VIEW public.rack_inventory
WITH (security_invoker = true) AS
SELECT
  r.id           AS rack_id,
  r.name         AS rack_name,
  r.almirah_id,
  r.capacity,
  COALESCE(COUNT(bl.book_id), 0)::int                   AS current_count,
  GREATEST(r.capacity - COALESCE(COUNT(bl.book_id), 0), 0)::int AS available
FROM public.racks r
LEFT JOIN public.book_locations bl ON bl.rack_id = r.id
WHERE r.deleted_at IS NULL
GROUP BY r.id;

GRANT SELECT ON public.rack_inventory TO authenticated;
GRANT ALL   ON public.rack_inventory TO service_role;
