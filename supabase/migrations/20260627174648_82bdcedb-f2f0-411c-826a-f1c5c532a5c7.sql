
-- Tighten RLS policies to role-based access

-- MEMBERS: restrict to librarian/admin/super_admin (contains PII)
DROP POLICY IF EXISTS "Auth manage members" ON public.members;
CREATE POLICY "Staff manage members" ON public.members FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'librarian'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'librarian'));

-- BOOK_ISSUES: restrict to librarian/admin/super_admin
DROP POLICY IF EXISTS "Auth manage issues" ON public.book_issues;
CREATE POLICY "Staff manage issues" ON public.book_issues FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'librarian'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'librarian'));

-- BOOKS: read for any authenticated, write for staff only
DROP POLICY IF EXISTS "Auth manage books" ON public.books;
CREATE POLICY "Auth view books" ON public.books FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff write books" ON public.books FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'librarian'));
CREATE POLICY "Staff update books" ON public.books FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'librarian'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'librarian'));
CREATE POLICY "Staff delete books" ON public.books FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'librarian'));

-- LIBRARY_MASTERS: read for authenticated, write for staff
DROP POLICY IF EXISTS "Auth manage masters" ON public.library_masters;
CREATE POLICY "Auth view masters" ON public.library_masters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff write masters" ON public.library_masters FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'librarian'));
CREATE POLICY "Staff update masters" ON public.library_masters FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'librarian'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'librarian'));
CREATE POLICY "Staff delete masters" ON public.library_masters FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'librarian'));

-- ACTIVITY_LOGS: only admins read; any authenticated can insert their own log entries
DROP POLICY IF EXISTS "Auth view logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Auth insert logs" ON public.activity_logs;
CREATE POLICY "Admins view logs" ON public.activity_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "Auth insert own logs" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- USER_ROLES: split policy to explicitly block self-insert escalation
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admins update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admins delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

-- SECURITY DEFINER function: revoke public EXECUTE on has_role; RLS evaluates as table owner
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
