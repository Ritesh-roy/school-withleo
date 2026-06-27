
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin','admin','librarian','teacher','student');
CREATE TYPE public.master_type AS ENUM ('library','book_type','language','category','author','publisher','editor','access_type','subject','location','status');
CREATE TYPE public.issue_status AS ENUM ('issued','returned','overdue','lost');
CREATE TYPE public.member_type AS ENUM ('student','teacher','staff');

-- ============ UPDATED_AT HELPER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- admins manage roles
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- ============ NEW USER TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);

  SELECT count(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'librarian'));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ LIBRARY MASTERS ============
CREATE TABLE public.library_masters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  master_type master_type NOT NULL,
  name TEXT NOT NULL,
  status BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_masters TO authenticated;
GRANT ALL ON public.library_masters TO service_role;
ALTER TABLE public.library_masters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage masters" ON public.library_masters FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_masters_updated BEFORE UPDATE ON public.library_masters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MEMBERS ============
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_no BIGINT GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  member_type member_type NOT NULL DEFAULT 'student',
  mobile_no TEXT,
  email TEXT,
  address TEXT,
  gender TEXT,
  city TEXT,
  pin_code TEXT,
  photo_url TEXT,
  membership_date DATE DEFAULT now(),
  expiry_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO authenticated;
GRANT ALL ON public.members TO service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage members" ON public.members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_members_updated BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ BOOKS ============
CREATE TABLE public.books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_no BIGINT GENERATED ALWAYS AS IDENTITY,
  collection_name TEXT,
  title TEXT NOT NULL,
  isbn TEXT,
  author TEXT,
  editor TEXT,
  edition TEXT,
  volume TEXT,
  category TEXT,
  access_type TEXT DEFAULT 'Issuable',
  language TEXT,
  publisher TEXT,
  publishing_year TEXT,
  place TEXT,
  subject TEXT,
  location TEXT,
  status TEXT,
  no_of_pages INT DEFAULT 0,
  no_of_copies INT NOT NULL DEFAULT 1,
  available_copies INT NOT NULL DEFAULT 1,
  price NUMERIC DEFAULT 0,
  mrp NUMERIC DEFAULT 0,
  content TEXT,
  cover_image TEXT,
  purchase_date DATE,
  damage_date DATE,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage books" ON public.books FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_books_updated BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ BOOK ISSUES ============
CREATE TABLE public.book_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  issue_date DATE NOT NULL DEFAULT now(),
  due_date DATE NOT NULL,
  return_date DATE,
  status issue_status NOT NULL DEFAULT 'issued',
  fine_amount NUMERIC NOT NULL DEFAULT 0,
  fine_collected NUMERIC NOT NULL DEFAULT 0,
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_issues TO authenticated;
GRANT ALL ON public.book_issues TO service_role;
ALTER TABLE public.book_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage issues" ON public.book_issues FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_issues_updated BEFORE UPDATE ON public.book_issues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SETTINGS ============
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name TEXT NOT NULL DEFAULT 'Smart School',
  logo_url TEXT,
  address TEXT,
  email TEXT,
  phone TEXT,
  library_rules TEXT,
  fine_per_day NUMERIC NOT NULL DEFAULT 2,
  lost_book_charge NUMERIC NOT NULL DEFAULT 500,
  damage_charge NUMERIC NOT NULL DEFAULT 100,
  default_issue_days INT NOT NULL DEFAULT 14,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view settings" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage settings" ON public.settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
INSERT INTO public.settings (school_name) VALUES ('Smart School');

-- ============ ACTIVITY LOGS ============
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  actor_name TEXT,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view logs" ON public.activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ============ SEED MASTERS ============
INSERT INTO public.library_masters (master_type, name) VALUES
  ('category','Science'),('category','Commerce'),('category','Arts'),('category','Computer'),
  ('category','Programming'),('category','Mathematics'),('category','History'),('category','Geography'),
  ('category','English'),('category','Hindi'),('category','Competitive Exam'),('category','Other'),
  ('book_type','Text Book'),('book_type','Reference Book'),('book_type','Journal'),('book_type','Magazine'),
  ('language','English'),('language','Hindi'),('language','Gujarati'),
  ('access_type','Issuable'),('access_type','Reference Only'),
  ('status','Damaged'),('status','UnDamaged'),
  ('location','Rack A'),('location','Rack B'),('location','Rack C');
