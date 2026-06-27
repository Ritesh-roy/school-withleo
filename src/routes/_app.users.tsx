import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users as UsersIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/library/PageHeader";
import { DataTable, type Column } from "@/components/library/DataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_LABELS, useAuth, type AppRole } from "@/lib/auth";
import { fmtDate, logActivity } from "@/lib/helpers";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/users")({
  head: () => ({ meta: [{ title: "Users & Roles — School withleo" }] }),
  component: UsersPage,
});

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  role: AppRole | null;
}

function UsersPage() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email,created_at"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      return (profiles ?? []).map((p) => ({
        ...p,
        role: (roleMap.get(p.id) ?? null) as AppRole | null,
      })) as UserRow[];
    },
  });

  const changeRole = async (u: UserRow, role: AppRole) => {
    await supabase.from("user_roles").delete().eq("user_id", u.id);
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: u.id, role });
    if (error) return toast.error(error.message);
    toast.success(`Role updated for ${u.full_name || u.email}`);
    logActivity("Change role", `${u.email} → ${ROLE_LABELS[role]}`);
    qc.invalidateQueries({ queryKey: ["users"] });
  };

  const columns: Column<UserRow>[] = [
    { header: "Name", cell: (u) => <span className="font-medium">{u.full_name || "-"}</span>, searchValue: (u) => u.full_name ?? "" },
    { header: "Email", cell: (u) => u.email || "-", searchValue: (u) => u.email ?? "" },
    { header: "Joined", cell: (u) => fmtDate(u.created_at) },
    {
      header: "Role",
      cell: (u) => (
        <Select
          value={u.role ?? undefined}
          onValueChange={(v) => changeRole(u, v as AppRole)}
          disabled={u.id === user?.id}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="No role" />
          </SelectTrigger>
          <SelectContent>
            {(["super_admin", "admin", "librarian", "teacher", "student"] as AppRole[]).map(
              (r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        description="Manage staff access and permissions"
        icon={<UsersIcon className="h-6 w-6 text-primary" />}
      />
      <DataTable columns={columns} data={users} searchPlaceholder="Search users…" />
    </div>
  );
}