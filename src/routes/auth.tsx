import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABELS, type AppRole } from "@/lib/auth";
import { seedDemoUsers } from "@/lib/seed-users.functions";
import { AppLogo } from "@/components/library/AppLogo";
import { APP_NAME, APP_TAGLINE } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: `Sign In — ${APP_NAME} Library` },
      {
        name: "description",
        content: "Secure login for the School withleo Library Management System.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState("login");
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuPassword, setShowSuPassword] = useState(false);
  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    seedDemoUsers().catch((e) => console.warn("Demo seed skipped:", e));
  }, []);

  // login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  // signup
  const [name, setName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [role, setRole] = useState<AppRole>("librarian");

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setLoginError(null);
    if (!emailRegex.test(email.trim())) {
      setLoginError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setLoginError("Password is required.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) {
      // Normalize Supabase's raw message to a user-friendly line.
      const msg = /invalid.*credentials/i.test(error.message)
        ? "Invalid login credentials. Please check your email and password."
        : error.message;
      setLoginError(msg);
      return;
    }
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setSignupError(null);
    if (!name.trim()) return setSignupError("Full Name is required.");
    if (!emailRegex.test(suEmail.trim()))
      return setSignupError("Please enter a valid email address.");
    if (suPassword.length < 6)
      return setSignupError("Password must be at least 6 characters.");
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: suEmail.trim(),
      password: suPassword,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name.trim(), role },
      },
    });
    setBusy(false);
    if (error) return setSignupError(error.message);
    toast.success("Account created! Signing you in…");
    navigate({ to: "/dashboard" });
  };

  const handleForgot = async () => {
    if (!emailRegex.test(email.trim())) {
      setLoginError("Please enter a valid email address first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Password reset link sent to your email.");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-topbar p-12 text-topbar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg bg-white/15 p-1">
            <AppLogo className="h-full w-full" />
          </div>
          <div>
            <p className="text-lg font-bold leading-tight">{APP_NAME}</p>
            <p className="text-sm text-topbar-foreground/70">{APP_TAGLINE}</p>
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">
            Run your library
            <br />
            like clockwork.
          </h1>
          <p className="mt-4 max-w-md text-topbar-foreground/80">
            Catalogue thousands of books, manage members, issue & return with
            automatic fine calculation, and export rich reports — all in one
            modern dashboard.
          </p>
        </div>
        <p className="text-sm text-topbar-foreground/60">
          © {new Date().getFullYear()} {APP_NAME}
        </p>
      </div>

      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="h-8 w-8 overflow-hidden rounded-md">
              <AppLogo className="h-full w-full" />
            </div>
            <span className="text-lg font-bold">{APP_NAME}</span>
          </div>
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v);
              setLoginError(null);
              setSignupError(null);
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 pt-4" noValidate>
                {/* Inline error banner directly above the fields */}
                {loginError && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    placeholder="Enter email address"
                    aria-invalid={!!loginError}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (loginError) setLoginError(null);
                      }}
                      placeholder="Enter password"
                      className="pr-10"
                      aria-invalid={!!loginError}
                      required
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={remember}
                      onCheckedChange={(v) => setRemember(Boolean(v))}
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    onClick={handleForgot}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 pt-4" noValidate>
                {signupError && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{signupError}</span>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    maxLength={120}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="su-email"
                    type="email"
                    value={suEmail}
                    onChange={(e) => setSuEmail(e.target.value)}
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-password">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="su-password"
                      type={showSuPassword ? "text" : "password"}
                      minLength={6}
                      value={suPassword}
                      onChange={(e) => setSuPassword(e.target.value)}
                      placeholder="Enter password (min 6 characters)"
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowSuPassword((v) => !v)}
                      aria-label={showSuPassword ? "Hide password" : "Show password"}
                      aria-pressed={showSuPassword}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    >
                      {showSuPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["admin", "librarian", "teacher", "student"] as AppRole[]).map(
                        (r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The very first account becomes Super Admin automatically.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:underline">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
