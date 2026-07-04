
-- 1) Tighten activity_logs INSERT: require user_id to match the caller.
DROP POLICY IF EXISTS "Auth insert own logs" ON public.activity_logs;
CREATE POLICY "Auth insert own logs"
  ON public.activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2) profiles: replace open SELECT with own-row + admin/super_admin read.
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;
CREATE POLICY "Users view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

-- 3) settings: restrict SELECT to staff roles only.
DROP POLICY IF EXISTS "Auth view settings" ON public.settings;
CREATE POLICY "Staff view settings"
  ON public.settings
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'librarian'::public.app_role)
  );

-- 4) Lock down SECURITY DEFINER function exposure to anon.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.issue_book_atomic(uuid, uuid, date, date, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 5) Defense-in-depth inside SECURITY DEFINER functions still callable by
--    authenticated (required by RLS / app RPC).
--    has_role: only allow callers to check their OWN role, so a signed-in
--    user cannot probe other users' privileges.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (
        _user_id = auth.uid()
        OR auth.uid() IS NULL  -- allow trigger / SECURITY DEFINER internal use
      )
  );
$$;

-- issue_book_atomic: require caller to be library staff so a random
-- authenticated user can't issue books to arbitrary members via RPC.
CREATE OR REPLACE FUNCTION public.issue_book_atomic(
  _member_id uuid,
  _book_id uuid,
  _issue_date date,
  _due_date date,
  _allow_overdue boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available int;
  v_overdue_count int;
  v_overdue_titles text;
  v_issue_id uuid;
  v_caller uuid := auth.uid();
BEGIN
  -- AuthZ: only library staff may issue books.
  IF v_caller IS NULL
     OR NOT (
       EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_caller AND role = 'librarian'::public.app_role)
       OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_caller AND role = 'admin'::public.app_role)
       OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_caller AND role = 'super_admin'::public.app_role)
     )
  THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT available_copies INTO v_available
  FROM public.books WHERE id = _book_id AND is_deleted = false
  FOR UPDATE;

  IF v_available IS NULL THEN
    RAISE EXCEPTION 'BOOK_NOT_FOUND';
  END IF;

  IF v_available <= 0 THEN
    RAISE EXCEPTION 'ALREADY_ISSUED';
  END IF;

  IF NOT _allow_overdue THEN
    SELECT count(*),
           string_agg(coalesce(b.title,'(untitled)'), ', ')
    INTO v_overdue_count, v_overdue_titles
    FROM public.book_issues bi
    LEFT JOIN public.books b ON b.id = bi.book_id
    WHERE bi.member_id = _member_id
      AND bi.status IN ('issued','overdue')
      AND bi.due_date < CURRENT_DATE;

    IF coalesce(v_overdue_count,0) > 0 THEN
      RAISE EXCEPTION 'MEMBER_OVERDUE:%:%', v_overdue_count, coalesce(v_overdue_titles,'');
    END IF;
  END IF;

  INSERT INTO public.book_issues(member_id, book_id, issue_date, due_date, status)
  VALUES (_member_id, _book_id, _issue_date, _due_date, 'issued')
  RETURNING id INTO v_issue_id;

  UPDATE public.books
  SET available_copies = greatest(0, available_copies - 1)
  WHERE id = _book_id;

  RETURN v_issue_id;
END;
$$;
