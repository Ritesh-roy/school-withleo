-- Atomic book issue with race-condition protection, duplicate-copy prevention,
-- and overdue-book block for the borrowing member.

CREATE OR REPLACE FUNCTION public.issue_book_atomic(
  _member_id uuid,
  _book_id uuid,
  _issue_date date,
  _due_date date,
  _allow_overdue boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available int;
  v_active int;
  v_overdue_count int;
  v_overdue_titles text;
  v_issue_id uuid;
BEGIN
  -- Lock the book row to serialise concurrent issues.
  SELECT available_copies INTO v_available
  FROM public.books WHERE id = _book_id AND is_deleted = false
  FOR UPDATE;

  IF v_available IS NULL THEN
    RAISE EXCEPTION 'BOOK_NOT_FOUND';
  END IF;

  -- Count currently-active issues for this exact book row (Collection No).
  SELECT count(*) INTO v_active
  FROM public.book_issues
  WHERE book_id = _book_id AND status IN ('issued','overdue');

  IF v_active >= v_available + v_active THEN
    -- Impossible branch — kept for clarity
    NULL;
  END IF;

  IF v_available <= 0 THEN
    RAISE EXCEPTION 'ALREADY_ISSUED';
  END IF;

  -- Member overdue check (skippable by admin override).
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

REVOKE ALL ON FUNCTION public.issue_book_atomic(uuid, uuid, date, date, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_book_atomic(uuid, uuid, date, date, boolean) TO authenticated;
