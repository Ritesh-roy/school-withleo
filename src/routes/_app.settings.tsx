import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/library/PageHeader";
import { FormField } from "@/components/library/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { logActivity } from "@/lib/helpers";
import {
  handleFormKeyDown,
  restrict,
  sanitize,
  validators,
} from "@/lib/form-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Smart School ERP" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("*").maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        id: data.id,
        school_name: data.school_name ?? "",
        logo_url: data.logo_url ?? "",
        address: data.address ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        library_rules: data.library_rules ?? "",
        fine_per_day: String(data.fine_per_day ?? 2),
        lost_book_charge: String(data.lost_book_charge ?? 500),
        damage_charge: String(data.damage_charge ?? 100),
        default_issue_days: String(data.default_issue_days ?? 14),
      });
    }
  }, [data]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));

  const errors = useMemo(
    () => ({
      school_name: validators.required(form.school_name, "School Name"),
      email: form.email ? validators.email(form.email) : null,
      phone: form.phone ? validators.phone(form.phone) : null,
      logo_url: form.logo_url ? validators.url(form.logo_url) : null,
      fine_per_day: validators.positiveNumber(form.fine_per_day, "Fine Per Day"),
      lost_book_charge: validators.positiveNumber(
        form.lost_book_charge,
        "Lost Book Charge",
      ),
      damage_charge: validators.positiveNumber(form.damage_charge, "Damage Charge"),
      default_issue_days:
        validators.required(form.default_issue_days, "Default Issue Days") ||
        validators.greaterThanZero(form.default_issue_days, "Default Issue Days"),
    }),
    [form],
  );
  const isValid = Object.values(errors).every((v) => !v);
  const err = (k: keyof typeof errors) => (touched[k] ? errors[k] : null);

  const save = async () => {
    setTouched(
      Object.keys(errors).reduce<Record<string, boolean>>(
        (a, k) => ({ ...a, [k]: true }),
        {},
      ),
    );
    if (!isValid) return toast.error("Please fix the highlighted fields.");
    if (saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("settings")
        .update({
          school_name: form.school_name.trim(),
          logo_url: form.logo_url.trim() || null,
          address: form.address.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          library_rules: form.library_rules.trim() || null,
          fine_per_day: parseFloat(form.fine_per_day) || 0,
          lost_book_charge: parseFloat(form.lost_book_charge) || 0,
          damage_charge: parseFloat(form.damage_charge) || 0,
          default_issue_days: parseInt(form.default_issue_days) || 14,
        })
        .eq("id", form.id);
      if (error) throw error;
      toast.success("Settings saved successfully");
      logActivity("Update settings");
      qc.invalidateQueries({ queryKey: ["settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="App Settings"
        description="School details and fine rules"
        icon={<SettingsIcon className="h-6 w-6 text-primary" />}
      />
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        onKeyDown={handleFormKeyDown}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="mb-4 font-semibold">School Details</h3>
            <div className="space-y-4">
              <FormField label="School Name" required error={err("school_name")}>
                <Input
                  placeholder="Enter school name"
                  value={form.school_name ?? ""}
                  maxLength={120}
                  onChange={(e) => set("school_name", e.target.value)}
                  onBlur={() => touch("school_name")}
                />
              </FormField>
              <FormField label="Logo URL" error={err("logo_url")}>
                <Input
                  placeholder="https://…"
                  value={form.logo_url ?? ""}
                  onChange={(e) => set("logo_url", e.target.value)}
                  onBlur={() => touch("logo_url")}
                />
              </FormField>
              <FormField label="Email" error={err("email")}>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={form.email ?? ""}
                  onChange={(e) => set("email", e.target.value)}
                  onBlur={() => touch("email")}
                />
              </FormField>
              <FormField label="Phone" error={err("phone")}>
                <Input
                  placeholder="Enter mobile number"
                  inputMode="numeric"
                  value={form.phone ?? ""}
                  onKeyDown={restrict.digits}
                  onChange={(e) => set("phone", sanitize.digits(e.target.value, 10))}
                  onBlur={() => touch("phone")}
                />
              </FormField>
              <FormField label="Address">
                <Textarea
                  placeholder="Enter full address…"
                  value={form.address ?? ""}
                  onChange={(e) => set("address", e.target.value)}
                  rows={2}
                  maxLength={300}
                />
              </FormField>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="mb-4 font-semibold">Fine & Library Rules</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Fine Per Day (₹)" required error={err("fine_per_day")}>
                  <Input
                    placeholder="Enter fine amount"
                    inputMode="decimal"
                    value={form.fine_per_day ?? ""}
                    onKeyDown={restrict.decimal}
                    onChange={(e) => set("fine_per_day", sanitize.decimal(e.target.value))}
                    onBlur={() => touch("fine_per_day")}
                  />
                </FormField>
                <FormField label="Default Issue Days" required error={err("default_issue_days")}>
                  <Input
                    placeholder="Enter default days"
                    inputMode="numeric"
                    value={form.default_issue_days ?? ""}
                    onKeyDown={restrict.digits}
                    onChange={(e) => set("default_issue_days", sanitize.digits(e.target.value, 4))}
                    onBlur={() => touch("default_issue_days")}
                  />
                </FormField>
                <FormField label="Lost Book Charge (₹)" error={err("lost_book_charge")}>
                  <Input
                    placeholder="Enter charge"
                    inputMode="decimal"
                    value={form.lost_book_charge ?? ""}
                    onKeyDown={restrict.decimal}
                    onChange={(e) => set("lost_book_charge", sanitize.decimal(e.target.value))}
                    onBlur={() => touch("lost_book_charge")}
                  />
                </FormField>
                <FormField label="Damage Charge (₹)" error={err("damage_charge")}>
                  <Input
                    placeholder="Enter charge"
                    inputMode="decimal"
                    value={form.damage_charge ?? ""}
                    onKeyDown={restrict.decimal}
                    onChange={(e) => set("damage_charge", sanitize.decimal(e.target.value))}
                    onBlur={() => touch("damage_charge")}
                  />
                </FormField>
              </div>
              <FormField label="Library Rules">
                <Textarea
                  placeholder="Enter library rules and policies…"
                  value={form.library_rules ?? ""}
                  onChange={(e) => set("library_rules", e.target.value)}
                  rows={4}
                  maxLength={2000}
                />
              </FormField>
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button type="submit" disabled={saving || !isValid}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
