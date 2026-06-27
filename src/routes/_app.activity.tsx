import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/library/PageHeader";
import { DataTable, type Column } from "@/components/library/DataTable";
import { fmtDate } from "@/lib/helpers";

export const Route = createFileRoute("/_app/activity")({
  head: () => ({ meta: [{ title: "Activity Logs — School withleo" }] }),
  component: Activity,
});

interface LogRow {
  id: string;
  actor_name: string | null;
  action: string;
  detail: string | null;
  created_at: string;
}

function Activity() {
  const { data: logs = [] } = useQuery({
    queryKey: ["activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("id,actor_name,action,detail,created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as LogRow[];
    },
  });

  const columns: Column<LogRow>[] = [
    { header: "User", cell: (l) => l.actor_name || "-", searchValue: (l) => l.actor_name ?? "" },
    { header: "Action", cell: (l) => <span className="font-medium">{l.action}</span>, searchValue: (l) => l.action },
    { header: "Detail", cell: (l) => l.detail || "-", searchValue: (l) => l.detail ?? "" },
    {
      header: "Date",
      cell: (l) => new Date(l.created_at).toLocaleString("en-GB"),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Activity Logs"
        description="Audit trail of key actions"
        icon={<ScrollText className="h-6 w-6 text-primary" />}
      />
      <DataTable columns={columns} data={logs} searchPlaceholder="Search logs…" pageSize={15} />
    </div>
  );
}