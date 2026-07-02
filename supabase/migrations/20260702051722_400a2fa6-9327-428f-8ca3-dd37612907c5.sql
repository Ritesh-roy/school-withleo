
-- =====================================================================
-- 0. DEDUPE EXISTING BOOK ISBNs (keep oldest, soft-delete newer dupes)
-- =====================================================================
WITH dupes AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY lower(regexp_replace(isbn, '[^0-9Xx]', '', 'g'))
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.books
  WHERE isbn IS NOT NULL AND isbn <> '' AND is_deleted = false
)
UPDATE public.books b
SET is_deleted = true
FROM dupes
WHERE b.id = dupes.id AND dupes.rn > 1;

-- =====================================================================
-- 1. LOCATION HIERARCHY TABLES
-- =====================================================================

CREATE TABLE public.campuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  status boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campuses TO authenticated;
GRANT ALL ON public.campuses TO service_role;
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id uuid NOT NULL REFERENCES public.campuses(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  status boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campus_id, name)
);
CREATE INDEX idx_buildings_campus ON public.buildings(campus_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buildings TO authenticated;
GRANT ALL ON public.buildings TO service_role;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.floors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  name text NOT NULL,
  level_no int,
  status boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (building_id, name)
);
CREATE INDEX idx_floors_building ON public.floors(building_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.floors TO authenticated;
GRANT ALL ON public.floors TO service_role;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id uuid NOT NULL REFERENCES public.floors(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  status boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (floor_id, name)
);
CREATE INDEX idx_rooms_floor ON public.rooms(floor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.almirahs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  status boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, name)
);
CREATE INDEX idx_almirahs_room ON public.almirahs(room_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.almirahs TO authenticated;
GRANT ALL ON public.almirahs TO service_role;
ALTER TABLE public.almirahs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.racks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  almirah_id uuid NOT NULL REFERENCES public.almirahs(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  capacity int NOT NULL DEFAULT 100,
  status boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (almirah_id, name)
);
CREATE INDEX idx_racks_almirah ON public.racks(almirah_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.racks TO authenticated;
GRANT ALL ON public.racks TO service_role;
ALTER TABLE public.racks ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.shelves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rack_id uuid NOT NULL REFERENCES public.racks(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int,
  status boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rack_id, name)
);
CREATE INDEX idx_shelves_rack ON public.shelves(rack_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shelves TO authenticated;
GRANT ALL ON public.shelves TO service_role;
ALTER TABLE public.shelves ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 2. BOOK LOCATION LINK
-- =====================================================================

CREATE TABLE public.book_locations (
  book_id uuid PRIMARY KEY REFERENCES public.books(id) ON DELETE CASCADE,
  campus_id uuid REFERENCES public.campuses(id) ON DELETE SET NULL,
  building_id uuid REFERENCES public.buildings(id) ON DELETE SET NULL,
  floor_id uuid REFERENCES public.floors(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  almirah_id uuid REFERENCES public.almirahs(id) ON DELETE SET NULL,
  rack_id uuid REFERENCES public.racks(id) ON DELETE SET NULL,
  shelf_id uuid REFERENCES public.shelves(id) ON DELETE SET NULL,
  position int,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_book_locations_rack ON public.book_locations(rack_id);
CREATE INDEX idx_book_locations_shelf ON public.book_locations(shelf_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_locations TO authenticated;
GRANT ALL ON public.book_locations TO service_role;
ALTER TABLE public.book_locations ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 3. TRANSFERS & MOVEMENTS
-- =====================================================================

CREATE TABLE public.book_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  from_rack_id uuid REFERENCES public.racks(id),
  to_rack_id uuid REFERENCES public.racks(id),
  from_snapshot jsonb,
  to_snapshot jsonb,
  moved_by uuid REFERENCES auth.users(id),
  moved_by_name text,
  remarks text,
  moved_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_transfers_book ON public.book_transfers(book_id);
CREATE INDEX idx_transfers_time ON public.book_transfers(moved_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_transfers TO authenticated;
GRANT ALL ON public.book_transfers TO service_role;
ALTER TABLE public.book_transfers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.book_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN
    ('issue','return','transfer','lost','damaged','deleted','updated','placed')),
  actor_id uuid REFERENCES auth.users(id),
  actor_name text,
  from_snapshot jsonb,
  to_snapshot jsonb,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_movements_book_time ON public.book_movements(book_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_movements TO authenticated;
GRANT ALL ON public.book_movements TO service_role;
ALTER TABLE public.book_movements ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 4. RLS POLICIES
-- =====================================================================

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'campuses','buildings','floors','rooms','almirahs','racks','shelves',
    'book_locations','book_transfers','book_movements'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY "Auth read %I" ON public.%I FOR SELECT TO authenticated USING (true);',
      t, t);
    EXECUTE format($p$
      CREATE POLICY "Staff write %1$I" ON public.%1$I FOR ALL TO authenticated
      USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'librarian'))
      WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'librarian'));
    $p$, t);
  END LOOP;
END $$;

-- =====================================================================
-- 5. UPDATED_AT TRIGGERS
-- =====================================================================

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'campuses','buildings','floors','rooms','almirahs','racks','shelves','book_locations'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();',
      t);
  END LOOP;
END $$;

-- =====================================================================
-- 6. RACK INVENTORY VIEW
-- =====================================================================

CREATE OR REPLACE VIEW public.rack_inventory AS
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

-- =====================================================================
-- 7. AUTO-LOG PLACEMENT / TRANSFER
-- =====================================================================

CREATE OR REPLACE FUNCTION public.log_book_location_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

CREATE TRIGGER trg_book_location_movement
AFTER INSERT OR UPDATE ON public.book_locations
FOR EACH ROW EXECUTE FUNCTION public.log_book_location_change();

-- =====================================================================
-- 8. UNIQUE ISBN GUARD
-- =====================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uniq_books_isbn_active
  ON public.books (lower(regexp_replace(isbn, '[^0-9Xx]', '', 'g')))
  WHERE isbn IS NOT NULL AND isbn <> '' AND is_deleted = false;

-- =====================================================================
-- 9. AUDIT LOG COLUMNS
-- =====================================================================

ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS event_type text;

CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_event ON public.activity_logs(event_type);
