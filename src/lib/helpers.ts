import { supabase } from "@/integrations/supabase/client";

export function fmtDate(d?: string | null) {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB"); // dd/mm/yyyy
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateISO: string, days: number) {
  const d = new Date(dateISO);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string) {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

export function currency(n?: number | null) {
  return `₹${Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export async function logActivity(action: string, detail?: string) {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    let actorName = data.user?.email ?? "";
    if (uid) {
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", uid)
        .maybeSingle();
      actorName = p?.full_name || actorName;
    }
    await supabase
      .from("activity_logs")
      .insert({ user_id: uid, actor_name: actorName, action, detail });
  } catch {
    /* non-blocking */
  }
}