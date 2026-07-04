import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Users,
  ArrowUpRight,
  AlertTriangle,
  ArrowDownLeft,
  IndianRupee,
  UserPlus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/library/StatCard";
import { currency, fmtDate } from "@/lib/helpers";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Library Dashboard — School withleo" }] }),
  component: Dashboard,
});


const CHART_COLORS = [
  "#3159b8",
  "#1f9d55",
  "#e08e0b",
  "#d64545",
  "#7c4dff",
  "#0891b2",
  "#db2777",
  "#65a30d",
];

// Sortable month key: "YYYY-MM" for correct chronological ordering,
// plus a display label. Chart sorts by the key, then renders the label.
function monthMeta(d: string) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = dt.getMonth(); // 0..11
  const key = `${y}-${String(m + 1).padStart(2, "0")}`;
  const label = dt.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  return { key, label };
}

function Dashboard() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const yearOptions = useMemo(() => {
    const yrs: number[] = [];
    for (let y = currentYear; y >= currentYear - 5; y--) yrs.push(y);
    return yrs;
  }, [currentYear]);

  const { data } = useQuery({
    queryKey: ["dashboard", year],
    queryFn: async () => {
      const from = `${year}-01-01`;
      const to = `${year}-12-31`;
      const [books, members, issues] = await Promise.all([
        supabase.from("books").select("id,category,no_of_copies").eq("is_deleted", false),
        supabase.from("members").select("id,created_at,is_active"),
        supabase
          .from("book_issues")
          .select("id,status,issue_date,return_date,fine_collected,fine_amount,due_date,created_at,member_id,book_id")
          .gte("issue_date", from)
          .lte("issue_date", to),
      ]);
      return {
        books: books.data ?? [],
        members: members.data ?? [],
        issues: issues.data ?? [],
      };
    },
  });

  const books = data?.books ?? [];
  const members = data?.members ?? [];
  const issues = data?.issues ?? [];


  const totalBooks = books.reduce((s, b) => s + (b.no_of_copies ?? 1), 0);
  const issued = issues.filter((i) => i.status === "issued" || i.status === "overdue");
  const today = new Date().toISOString().slice(0, 10);
  const overdue = issued.filter((i) => i.due_date < today);
  const returned = issues.filter((i) => i.status === "returned");
  const totalRevenue = issues.reduce((s, i) => s + Number(i.fine_collected ?? 0), 0);
  const thisMonth = new Date().getMonth();
  const newMembers = members.filter(
    (m) => new Date(m.created_at).getMonth() === thisMonth,
  ).length;

  // charts — bucket by "YYYY-MM" so months sort correctly (Jan → Dec).
  const issueByMonth: Record<string, { label: string; count: number }> = {};
  issues.forEach((i) => {
    if (!i.issue_date) return;
    const { key, label } = monthMeta(i.issue_date);
    if (!issueByMonth[key]) issueByMonth[key] = { label, count: 0 };
    issueByMonth[key].count += 1;
  });
  const issueChart = Object.entries(issueByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([, v]) => ({ month: v.label, Issues: v.count }));

  const byCategory: Record<string, number> = {};
  books.forEach((b) => {
    const k = b.category || "Uncategorized";
    byCategory[k] = (byCategory[k] ?? 0) + 1;
  });
  const categoryChart = Object.entries(byCategory).map(([name, value]) => ({
    name,
    value,
  }));

  const revByMonth: Record<string, { label: string; total: number }> = {};
  issues.forEach((i) => {
    if (i.fine_collected) {
      const { key, label } = monthMeta(i.return_date || i.issue_date);
      if (!revByMonth[key]) revByMonth[key] = { label, total: 0 };
      revByMonth[key].total += Number(i.fine_collected);
    }
  });
  const revChart = Object.entries(revByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([, v]) => ({ month: v.label, Revenue: v.total }));

  const recent = [...issues]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 6);

  const pieTotal = categoryChart.reduce((s, c) => s + c.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Library Dashboard</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Year</span>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Books" value={totalBooks} icon={BookOpen} variant="blue" />
        <StatCard label="Members" value={members.length} icon={Users} variant="green" />
        <StatCard label="Issued Books" value={issued.length} icon={ArrowUpRight} variant="orange" />
        <StatCard label="Overdue Books" value={overdue.length} icon={AlertTriangle} variant="red" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Books Returned" value={returned.length} icon={ArrowDownLeft} variant="green" />
        <StatCard label="Fine Revenue" value={currency(totalRevenue)} icon={IndianRupee} variant="blue" />
        <StatCard label="New Members (Month)" value={newMembers} icon={UserPlus} variant="orange" />
        <StatCard label="Active Members" value={members.filter((m) => m.is_active).length} icon={Users} variant="blue" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="mb-4 font-semibold">Book Issue Analytics — {year}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={issueChart}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="Issues" fill="#3159b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="mb-4 font-semibold">Books by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Pie
                data={categoryChart}
                dataKey="value"
                nameKey="name"
                cx="42%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={1}
                minAngle={3}
                labelLine={false}
                label={({ percent }) => {
                  // in-slice percent only for larger slices; details live in legend
                  if (!percent || percent < 0.08) return "";
                  return `${Math.round(percent * 100)}%`;
                }}
              >
                {categoryChart.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => {
                  const pct = pieTotal ? Math.round((value / pieTotal) * 100) : 0;
                  return [`${value} (${pct}%)`, name];
                }}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconSize={10}
                wrapperStyle={{ fontSize: 12, lineHeight: "20px", maxWidth: 170 }}
                formatter={(value, entry) => {
                  const v = (entry?.payload as { value?: number } | undefined)?.value ?? 0;
                  const pct = pieTotal ? Math.round((v / pieTotal) * 100) : 0;
                  return `${value} — ${pct}%`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="mb-4 font-semibold">Monthly Fine Revenue</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={revChart}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="Revenue" stroke="#1f9d55" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="mb-4 font-semibold">Recent Activity</h3>
          <div className="space-y-3">
            {recent.length === 0 && (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            )}
            {recent.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between border-b pb-2 text-sm last:border-0"
              >
                <span className="capitalize">{i.status} book</span>
                <span className="text-muted-foreground">
                  {fmtDate(i.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}