import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UserSquare2,
  Save,
  RotateCcw,
  Pencil,
  Trash2,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/library/PageHeader";
import { DataTable, type Column } from "@/components/library/DataTable";
import { FormField } from "@/components/library/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fmtDate, logActivity, todayISO, addDays } from "@/lib/helpers";
import { exportToExcel } from "@/lib/exports";
import {
  handleFormKeyDown,
  restrict,
  sanitize,
  validators,
} from "@/lib/form-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/members")({
  head: () => ({ meta: [{ title: "Membership — Smart School ERP" }] }),
  component: Members,
});

type MType = "student" | "teacher" | "staff";
interface MemberRow {
  id: string;
  member_no: number;
  name: string;
  member_type: MType;
  mobile_no: string | null;
  email: string | null;
  address: string | null;
  gender: string | null;
  city: string | null;
  pin_code: string | null;
  membership_date: string | null;
  expiry_date: string | null;
  is_active: boolean;
}

const empty = {
  name: "",
  member_type: "student" as MType,
  mobile_no: "",
  email: "",
  address: "",
  gender: "",
  city: "",
  pin_code: "",
  membership_date: todayISO(),
  expiry_date: addDays(todayISO(), 365),
};

function Members() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...empty });
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof empty, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));

  const errors = useMemo(
    () => ({
      name: validators.required(form.name, "Member Name"),
      member_type: validators.required(form.member_type, "Membership Type"),
      mobile_no:
        validators.required(form.mobile_no, "Phone Number") ||
        validators.phone(form.mobile_no),
      email:
        validators.required(form.email, "Email") || validators.email(form.email),
      pin_code: form.pin_code ? validators.pin(form.pin_code) : null,
      membership_date: validators.required(form.membership_date, "Membership Date"),
      expiry_date: validators.required(form.expiry_date, "Expiry Date"),
    }),
    [form],
  );
  const isValid = Object.values(errors).every((v) => !v);
  const err = (k: keyof typeof errors) => (touched[k] ? errors[k] : null);

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("member_no", { ascending: false });
      if (error) throw error;
      return data as MemberRow[];
    },
  });

  const reset = () => {
    setForm({ ...empty });
    setEditId(null);
    setTouched({});
  };

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
    const payload = {
      name: form.name.trim(),
      member_type: form.member_type,
      mobile_no: form.mobile_no.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      gender: form.gender || null,
      city: form.city.trim() || null,
      pin_code: form.pin_code.trim() || null,
      membership_date: form.membership_date || null,
      expiry_date: form.expiry_date || null,
    };
    try {
      if (editId) {
        const { error } = await supabase.from("members").update(payload).eq("id", editId);
        if (error) throw error;
        toast.success("Member updated successfully");
        logActivity("Update member", form.name);
      } else {
        const { error } = await supabase.from("members").insert(payload);
        if (error) throw error;
        toast.success("Member added successfully");
        logActivity("Add member", form.name);
      }
      reset();
      qc.invalidateQueries({ queryKey: ["members"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save member");
    } finally {
      setSaving(false);
    }
  };

  const edit = (m: MemberRow) => {
    setEditId(m.id);
    setForm({
      name: m.name,
      member_type: m.member_type,
      mobile_no: m.mobile_no ?? "",
      email: m.email ?? "",
      address: m.address ?? "",
      gender: m.gender ?? "",
      city: m.city ?? "",
      pin_code: m.pin_code ?? "",
      membership_date: m.membership_date ?? todayISO(),
      expiry_date: m.expiry_date ?? addDays(todayISO(), 365),
    });
    setTouched({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("members").delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) return toast.error(error.message);
    toast.success("Member deleted");
    qc.invalidateQueries({ queryKey: ["members"] });
  };

  const columns: Column<MemberRow>[] = [
    { header: "Member No", cell: (m) => m.member_no, searchValue: (m) => String(m.member_no) },
    { header: "Name", cell: (m) => <span className="font-medium">{m.name}</span>, searchValue: (m) => m.name },
    { header: "Type", cell: (m) => <span className="capitalize">{m.member_type}</span> },
    { header: "Mobile", cell: (m) => m.mobile_no || "-", searchValue: (m) => m.mobile_no ?? "" },
    { header: "Email", cell: (m) => m.email || "-", searchValue: (m) => m.email ?? "" },
    { header: "Expiry", cell: (m) => fmtDate(m.expiry_date) },
    {
      header: "Action",
      className: "text-right",
      cell: (m) => (
        <div className="text-right">
          <button onClick={() => edit(m)} aria-label="Edit" className="mr-2 text-primary hover:opacity-70">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => setDeleteId(m.id)} aria-label="Delete" className="text-destructive hover:opacity-70">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Member Master"
        description="Manage library members"
        icon={<UserSquare2 className="h-6 w-6 text-primary" />}
        actions={
          <Button
            variant="outline"
            onClick={() =>
              exportToExcel(
                "Members",
                [
                  { header: "Member No", key: "member_no" },
                  { header: "Name", key: "name" },
                  { header: "Type", key: "member_type" },
                  { header: "Mobile", key: "mobile_no" },
                  { header: "Email", key: "email" },
                  { header: "Expiry", key: "expiry_date" },
                ],
                members as unknown as Record<string, unknown>[],
              )
            }
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export
          </Button>
        }
      />

      <form
        className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        onKeyDown={handleFormKeyDown}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Member Name" required error={err("name")}>
            <Input
              placeholder="Enter member name"
              value={form.name}
              maxLength={120}
              onChange={(e) => set("name", e.target.value)}
              onBlur={() => touch("name")}
            />
          </FormField>
          <FormField label="Membership Type" required error={err("member_type")}>
            <Select value={form.member_type} onValueChange={(v) => set("member_type", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Mobile No" required error={err("mobile_no")}>
            <Input
              placeholder="Enter mobile number"
              inputMode="numeric"
              value={form.mobile_no}
              onKeyDown={restrict.digits}
              onChange={(e) => set("mobile_no", sanitize.digits(e.target.value, 10))}
              onBlur={() => touch("mobile_no")}
            />
          </FormField>
          <FormField label="Email" required error={err("email")}>
            <Input
              type="email"
              placeholder="Enter email address"
              value={form.email}
              maxLength={120}
              onChange={(e) => set("email", e.target.value)}
              onBlur={() => touch("email")}
            />
          </FormField>
          <FormField label="Gender">
            <Select value={form.gender || undefined} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="City">
            <Input
              placeholder="Enter city"
              value={form.city}
              maxLength={80}
              onChange={(e) => set("city", e.target.value)}
            />
          </FormField>
          <FormField label="Pin Code" error={err("pin_code")}>
            <Input
              placeholder="Enter PIN code"
              inputMode="numeric"
              value={form.pin_code}
              onKeyDown={restrict.digits}
              onChange={(e) => set("pin_code", sanitize.digits(e.target.value, 6))}
              onBlur={() => touch("pin_code")}
            />
          </FormField>
          <FormField label="Membership Date" required error={err("membership_date")}>
            <Input
              type="date"
              value={form.membership_date}
              onChange={(e) => set("membership_date", e.target.value)}
              onBlur={() => touch("membership_date")}
            />
          </FormField>
          <FormField label="Expiry Date" required error={err("expiry_date")}>
            <Input
              type="date"
              value={form.expiry_date}
              onChange={(e) => set("expiry_date", e.target.value)}
              onBlur={() => touch("expiry_date")}
            />
          </FormField>
          <FormField label="Address" className="sm:col-span-2 lg:col-span-3">
            <Textarea
              placeholder="Enter full address…"
              value={form.address}
              rows={2}
              maxLength={300}
              onChange={(e) => set("address", e.target.value)}
            />
          </FormField>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="submit" disabled={saving || !isValid}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {editId ? "Update" : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={reset} disabled={saving}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
        </div>
      </form>

      <div className="mt-6">
        <DataTable columns={columns} data={members} searchPlaceholder="Search members…" />
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this member?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
