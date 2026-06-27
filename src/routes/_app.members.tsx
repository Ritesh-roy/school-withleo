import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UserSquare2,
  Save,
  RotateCcw,
  Pencil,
  Trash2,
  FileSpreadsheet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/library/PageHeader";
import { DataTable, type Column } from "@/components/library/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const set = (k: keyof typeof empty, v: string) => setForm((f) => ({ ...f, [k]: v }));

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
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Member name is required");
    const payload = {
      name: form.name.trim(),
      member_type: form.member_type,
      mobile_no: form.mobile_no || null,
      email: form.email || null,
      address: form.address || null,
      gender: form.gender || null,
      city: form.city || null,
      pin_code: form.pin_code || null,
      membership_date: form.membership_date || null,
      expiry_date: form.expiry_date || null,
    };
    if (editId) {
      const { error } = await supabase.from("members").update(payload).eq("id", editId);
      if (error) return toast.error(error.message);
      toast.success("Member updated");
      logActivity("Update member", form.name);
    } else {
      const { error } = await supabase.from("members").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Member added");
      logActivity("Add member", form.name);
    }
    reset();
    qc.invalidateQueries({ queryKey: ["members"] });
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
          <button onClick={() => edit(m)} className="mr-2 text-primary hover:opacity-70">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => setDeleteId(m.id)} className="text-destructive hover:opacity-70">
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

      <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Member Name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Membership Type</Label>
            <Select value={form.member_type} onValueChange={(v) => set("member_type", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Mobile No</Label>
            <Input value={form.mobile_no} onChange={(e) => set("mobile_no", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Gender</Label>
            <Select value={form.gender || undefined} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">City</Label>
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Pin Code</Label>
            <Input value={form.pin_code} onChange={(e) => set("pin_code", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Membership Date</Label>
            <Input type="date" value={form.membership_date} onChange={(e) => set("membership_date", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Expiry Date</Label>
            <Input type="date" value={form.expiry_date} onChange={(e) => set("expiry_date", e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
            <Label className="text-xs">Address</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={save}>
            <Save className="mr-2 h-4 w-4" />
            {editId ? "Update" : "Save"}
          </Button>
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
        </div>
      </div>

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