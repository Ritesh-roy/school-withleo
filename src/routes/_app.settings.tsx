import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/library/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logActivity } from "@/lib/helpers";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Smart School ERP" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
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

  const save = async () => {
    const { error } = await supabase
      .from("settings")
      .update({
        school_name: form.school_name,
        logo_url: form.logo_url || null,
        address: form.address || null,
        email: form.email || null,
        phone: form.phone || null,
        library_rules: form.library_rules || null,
        fine_per_day: parseFloat(form.fine_per_day) || 0,
        lost_book_charge: parseFloat(form.lost_book_charge) || 0,
        damage_charge: parseFloat(form.damage_charge) || 0,
        default_issue_days: parseInt(form.default_issue_days) || 14,
      })
      .eq("id", form.id);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    logActivity("Update settings");
    qc.invalidateQueries({ queryKey: ["settings"] });
  };

  return (
    <div>
      <PageHeader
        title="App Settings"
        description="School details and fine rules"
        icon={<SettingsIcon className="h-6 w-6 text-primary" />}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="mb-4 font-semibold">School Details</h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">School Name</Label>
              <Input value={form.school_name ?? ""} onChange={(e) => set("school_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Logo URL</Label>
              <Input value={form.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Address</Label>
              <Textarea value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} rows={2} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="mb-4 font-semibold">Fine & Library Rules</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Fine Per Day (₹)</Label>
                <Input type="number" value={form.fine_per_day ?? ""} onChange={(e) => set("fine_per_day", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Default Issue Days</Label>
                <Input type="number" value={form.default_issue_days ?? ""} onChange={(e) => set("default_issue_days", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Lost Book Charge (₹)</Label>
                <Input type="number" value={form.lost_book_charge ?? ""} onChange={(e) => set("lost_book_charge", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Damage Charge (₹)</Label>
                <Input type="number" value={form.damage_charge ?? ""} onChange={(e) => set("damage_charge", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Library Rules</Label>
              <Textarea value={form.library_rules ?? ""} onChange={(e) => set("library_rules", e.target.value)} rows={4} />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <Button onClick={save}>
          <Save className="mr-2 h-4 w-4" /> Save Settings
        </Button>
      </div>
    </div>
  );
}