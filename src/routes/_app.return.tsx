import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, Search, Printer, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/library/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { restrict, sanitize } from "@/lib/form-utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  currency,
  daysBetween,
  fmtDate,
  logActivity,
  todayISO,
} from "@/lib/helpers";
import { printRows } from "@/lib/exports";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/return")({
  head: () => ({ meta: [{ title: "Return Book — School withleo" }] }),
  component: ReturnBook,
});

interface IssueRow {
  id: string;
  book_id: string;
  issue_date: string;
  due_date: string;
  status: string;
  books: { collection_no: number; title: string; available_copies: number } | null;
  members: { name: string; member_no: number } | null;
}

function ReturnBook() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [paidInput, setPaidInput] = useState<Record<string, string>>({});

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("*").maybeSingle();
      return data;
    },
  });
  const finePerDay = settings?.fine_per_day ?? 2;

  const { data: issues = [] } = useQuery({
    queryKey: ["active-issues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("book_issues")
        .select(
          "id,book_id,issue_date,due_date,status,books(collection_no,title,available_copies),members(name,member_no)",
        )
        .in("status", ["issued", "overdue"])
        .order("issue_date");
      if (error) throw error;
      return data as unknown as IssueRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return issues;
    const q = search.toLowerCase();
    return issues.filter(
      (i) =>
        String(i.books?.collection_no ?? "").includes(q) ||
        (i.books?.title ?? "").toLowerCase().includes(q) ||
        (i.members?.name ?? "").toLowerCase().includes(q),
    );
  }, [issues, search]);

  const fineFor = (i: IssueRow) => {
    const overdue = daysBetween(i.due_date, todayISO());
    return overdue > 0 ? overdue * Number(finePerDay) : 0;
  };

  const paidFor = (i: IssueRow, fine: number) => {
    if (fine <= 0) return 0;
    const raw = paidInput[i.id];
    // Default paid amount = full fine; user can override with a partial value.
    if (raw === undefined || raw === "") return fine;
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) return 0;
    return Math.min(n, fine);
  };

  const doReturn = async (i: IssueRow) => {
    const fine = fineFor(i);
    const collected = paidFor(i, fine);
    const balance = Math.max(0, fine - collected);
    const { error } = await supabase
      .from("book_issues")
      .update({
        status: "returned",
        return_date: todayISO(),
        fine_amount: fine,
        fine_collected: collected,
      })
      .eq("id", i.id);
    if (error) return toast.error(error.message);
    if (i.books) {
      await supabase
        .from("books")
        .update({ available_copies: i.books.available_copies + 1 })
        .eq("id", i.book_id);
    }
    logActivity(
      "Return book",
      `${i.books?.title} — Fine ${currency(fine)}, Paid ${currency(collected)}, Balance ${currency(balance)}`,
    );
    toast.success(
      balance > 0
        ? `Book returned — Paid ${currency(collected)}, Balance ${currency(balance)}`
        : "Book returned",
    );
    qc.invalidateQueries({ queryKey: ["active-issues"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const printReceipt = (i: IssueRow) => {
    const fine = fineFor(i);
    printRows(
      "Return Receipt",
      [
        { header: "Field", key: "k" },
        { header: "Value", key: "v" },
      ],
      [
        { k: "Member", v: i.members?.name ?? "" },
        { k: "Book", v: i.books?.title ?? "" },
        { k: "Collection No", v: i.books?.collection_no ?? "" },
        { k: "Issue Date", v: fmtDate(i.issue_date) },
        { k: "Due Date", v: fmtDate(i.due_date) },
        { k: "Return Date", v: fmtDate(todayISO()) },
        { k: "Fine", v: currency(fine) },
      ],
    );
  };

  return (
    <div>
      <PageHeader
        title="Return Book"
        description="Search issued books, calculate fines and return"
        icon={<ArrowDownLeft className="h-6 w-6 text-primary" />}
      />

      <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Collection No, title or member name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Coll. No</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Fine</TableHead>
                <TableHead className="w-32">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Return</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    No issued books found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((i) => {
                  const fine = fineFor(i);
                  const overdue = daysBetween(i.due_date, todayISO()) > 0;
                  const paid = paidFor(i, fine);
                  const balance = Math.max(0, fine - paid);
                  return (
                    <TableRow key={i.id}>
                      <TableCell>{i.books?.collection_no}</TableCell>
                      <TableCell className="font-medium">{i.books?.title}</TableCell>
                      <TableCell>{i.members?.name}</TableCell>
                      <TableCell>{fmtDate(i.issue_date)}</TableCell>
                      <TableCell>
                        <span className={overdue ? "font-medium text-destructive" : ""}>
                          {fmtDate(i.due_date)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {currency(fine)}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={
                            paidInput[i.id] !== undefined
                              ? paidInput[i.id]
                              : fine > 0
                                ? String(fine)
                                : "0"
                          }
                          inputMode="decimal"
                          disabled={fine === 0}
                          onKeyDown={restrict.decimal}
                          onChange={(e) => {
                            const clean = sanitize.decimal(e.target.value);
                            setPaidInput((p) => ({ ...p, [i.id]: clean }));
                          }}
                          className="h-8 w-24 text-right"
                        />
                      </TableCell>
                      <TableCell
                        className={`text-right ${balance > 0 ? "font-medium text-destructive" : "text-muted-foreground"}`}
                      >
                        {currency(balance)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => printReceipt(i)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          <Button size="sm" onClick={() => doReturn(i)}>
                            <Undo2 className="mr-1 h-3.5 w-3.5" /> Return
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}