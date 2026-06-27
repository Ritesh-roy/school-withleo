import { createServerFn } from "@tanstack/react-start";

interface SeedUser {
  email: string;
  password: string;
  full_name: string;
  role: "admin" | "librarian" | "teacher";
}

const DEMO_USERS: SeedUser[] = [
  { email: "admin@leo.com", password: "admin@leo12", full_name: "Admin", role: "admin" },
  { email: "librarian@leo.com", password: "Librarian@123", full_name: "Librarian", role: "librarian" },
  { email: "teacher@leo.com", password: "Teacher@123", full_name: "Teacher", role: "teacher" },
];

/**
 * Idempotently creates the three fixed demo accounts (admin / librarian / teacher)
 * and ensures their role rows exist. Safe to call repeatedly.
 */
export const seedDemoUsers = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const results: Array<{ email: string; status: string }> = [];

  for (const u of DEMO_USERS) {
    // Try to find an existing user by email (paginate just in case).
    let existingId: string | null = null;
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = list?.users.find((x) => x.email?.toLowerCase() === u.email.toLowerCase());
    if (found) existingId = found.id;

    if (!existingId) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.full_name, role: u.role },
      });
      if (error || !created.user) {
        results.push({ email: u.email, status: `error: ${error?.message ?? "unknown"}` });
        continue;
      }
      existingId = created.user.id;
      results.push({ email: u.email, status: "created" });
    } else {
      // Make sure the password matches what the spec advertises.
      await supabaseAdmin.auth.admin.updateUserById(existingId, {
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.full_name, role: u.role },
      });
      results.push({ email: u.email, status: "updated" });
    }

    // Ensure profile row exists.
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: existingId, full_name: u.full_name, email: u.email }, { onConflict: "id" });

    // Ensure exactly the intended role is assigned.
    await supabaseAdmin.from("user_roles").delete().eq("user_id", existingId);
    await supabaseAdmin.from("user_roles").insert({ user_id: existingId, role: u.role });
  }

  return { ok: true, results };
});
