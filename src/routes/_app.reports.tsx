import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileBarChart,
  Search,
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/library/PageHeader";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  exportToExcel,
  exportToPdf,
  exportToCsv,
  printRows,
  type ExportColumn,
} from "@/lib/exports";
import { currency, fmtDate, todayISO } from "@/lib/helpers";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Library Reports — Smart School ERP" }] }),
  component: Reports,
});

type ReportKey =
  | "collection"
  | "issue"
  | "return"
  | "overdue"
  | "fine"
  | "membership";

const REPORTS: { key: ReportKey; label: string }[] = [
  { key: "collection", label: "Collection Details" },
  { key: "issue", label: "Issue Register" },
  { key: "return", label: "Return Register" },
  { key: "overdue", label: "Overdue Report" },
  { key: "fine", label: "Fine Details" },
  { key: "membership", label: "Membership Report" },
];

function Reports() {
  const [report, setReport] = useState<ReportKey>("collection");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [active, setActive] = useState<ReportKey>("collection");

  const { data: rows = [], refetch, isFetching } = useQuery({
    queryKey: ["report", active, from, to],
    queryFn: async (): Promise<Record<string, unknown>[]> =>
      (await buildReport(active, from, to)) as Record<string, unknown>[],
  });

  const cols = COLUMNS[active];
  const title = REPORTS.find((r) => r.key === active)!.label;

  const run = () => {
    setActive(report);
    setTimeout(() => refetch(), 0);
  };

  return (
    <div>
      <PageHeader
        title="Library Reports"
        description="Generate and export library reports"
        icon={<FileBarChart className="h-6 w-6 text-primary" />}
      />

      <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Report Type</Label>
            <Select value={report} onValueChange={(v) => setReport(v as ReportKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORTS.map((r) => (
                  <SelectItem key={r.key} value={r.key}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">From Date</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To Date</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={run} className="w-full">
              <Search className="mr-2 h-4 w-4" /> Search
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToExcel(title, cols, rows)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportToCsv(title, cols, rows)}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportToPdf(title, cols, rows)}>
            <FileText className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => printRows(title, cols, rows)}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {cols.map((c) => (
                  <TableHead key={c.key}>{c.header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={cols.length} className="py-8 text-center text-muted-foreground">
                    {isFetching ? "Loading…" : "No data for the selected criteria."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, idx) => (
                  <TableRow key={idx}>
                    {cols.map((c) => (
                      <TableCell key={c.key}>{String(row[c.key] ?? "")}</TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

const COLUMNS: Record<ReportKey, ExportColumn[]> = {
  collection: [
    { header: "Coll. No", key: "collection_no" },
    { header: "Title", key: "title" },
    { header: "Author", key: "author" },
    { header: "Category", key: "category" },
    { header: "Publisher", key: "publisher" },
    { header: "Copies", key: "copies" },
    { header: "Price", key: "price" },
  ],
  issue: [
    { header: "Coll. No", key: "collection_no" },
    { header: "Title", key: "title" },
    { header: "Member", key: "member" },
    { header: "Issue Date", key: "issue_date" },
    { header: "Due Date", key: "due_date" },
    { header: "Status", key: "status" },
  ],
  return: [
    { header: "Coll. No", key: "collection_no" },
    { header: "Title", key: "title" },
    { header: "Member", key: "member" },
    { header: "Issue Date", key: "issue_date" },
    { header: "Return Date", key: "return_date" },
    { header: "Fine", key: "fine" },
  ],
  overdue: [
    { header: "Coll. No", key: "collection_no" },
    { header: "Title", key: "title" },
    { header: "Member", key: "member" },
    { header: "Due Date", key: "due_date" },
    { header: "Days Overdue", key: "days" },
  ],
  fine: [
    { header: "Title", key: "title" },
    { header: "Member", key: "member" },
    { header: "Return Date", key: "return_date" },
    { header: "Fine Amount", key: "fine_amount" },
    { header: "Collected", key: "fine_collected" },
  ],
  membership: [
    { header: "Member No", key: "member_no" },
    { header: "Name", key: "name" },
    { header: "Type", key: "member_type" },
    { header: "Mobile", key: "mobile_no" },
    { header: "Expiry", key: "expiry_date" },
  ],
};

function inRange(date: string | null, from: string, to: string) {
  if (!date) return false;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

async function buildReport(report: ReportKey, from: string, to: string) {
  if (report === "collection") {
    const { data } = await supabase
      .from("books")
      .select("collection_no,title,author,category,publisher,no_of_copies,price,purchase_date")
      .eq("is_deleted", false)
      .order("collection_no");
    return (data ?? [])
      .filter((b) => (!from && !to ? true : inRange(b.purchase_date, from, to)))
      .map((b) => ({
        collection_no: b.collection_no,
        title: b.title,
        author: b.author ?? "",
        category: b.category ?? "",
        publisher: b.publisher ?? "",
        copies: b.no_of_copies,
        price: currency(b.price),
      }));
  }

  const { data } = await supabase
    .from("book_issues")
    .select(
      "issue_date,due_date,return_date,status,fine_amount,fine_collected,books(collection_no,title),members(name,member_no)",
    )
    .order("issue_date", { ascending: false });
  const issues = (data ?? []) as unknown as Array<{
    issue_date: string;
    due_date: string;
    return_date: string | null;
    status: string;
    fine_amount: number;
    fine_collected: number;
    books: { collection_no: number; title: string } | null;
    members: { name: string; member_no: number } | null;
  }>;

  if (report === "issue") {
    return issues
      .filter((i) => (!from && !to ? true : inRange(i.issue_date, from, to)))
      .map((i) => ({
        collection_no: i.books?.collection_no ?? "",
        title: i.books?.title ?? "",
        member: i.members?.name ?? "",
        issue_date: fmtDate(i.issue_date),
        due_date: fmtDate(i.due_date),
        status: i.status,
      }));
  }
  if (report === "return") {
    return issues
      .filter((i) => i.status === "returned")
      .filter((i) => (!from && !to ? true : inRange(i.return_date, from, to)))
      .map((i) => ({
        collection_no: i.books?.collection_no ?? "",
        title: i.books?.title ?? "",
        member: i.members?.name ?? "",
        issue_date: fmtDate(i.issue_date),
        return_date: fmtDate(i.return_date),
        fine: currency(i.fine_amount),
      }));
  }
  if (report === "overdue") {
    const today = todayISO();
    return issues
      .filter((i) => (i.status === "issued" || i.status === "overdue") && i.due_date < today)
      .map((i) => ({
        collection_no: i.books?.collection_no ?? "",
        title: i.books?.title ?? "",
        member: i.members?.name ?? "",
        due_date: fmtDate(i.due_date),
        days: Math.floor(
          (new Date(today).getTime() - new Date(i.due_date).getTime()) / 86400000,
        ),
      }));
  }
  if (report === "fine") {
    return issues
      .filter((i) => Number(i.fine_amount) > 0)
      .filter((i) => (!from && !to ? true : inRange(i.return_date, from, to)))
      .map((i) => ({
        title: i.books?.title ?? "",
        member: i.members?.name ?? "",
        return_date: fmtDate(i.return_date),
        fine_amount: currency(i.fine_amount),
        fine_collected: currency(i.fine_collected),
      }));
  }
  // membership
  const { data: members } = await supabase
    .from("members")
    .select("member_no,name,member_type,mobile_no,expiry_date,membership_date")
    .order("member_no");
  return (members ?? [])
    .filter((m) => (!from && !to ? true : inRange(m.membership_date, from, to)))
    .map((m) => ({
      member_no: m.member_no,
      name: m.name,
      member_type: m.member_type,
      mobile_no: m.mobile_no ?? "",
      expiry_date: fmtDate(m.expiry_date),
    }));
}