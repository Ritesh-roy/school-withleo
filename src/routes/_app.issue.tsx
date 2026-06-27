import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Plus, Trash2, BookCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/library/PageHeader";
import { FormField } from "@/components/library/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { addDays, fmtDate, logActivity, todayISO } from "@/lib/helpers";
import { handleFormKeyDown, validators } from "@/lib/form-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/issue")({
  head: () => ({ meta: [{ title: "Issue Book — School withleo" }] }),
  component: IssueBook,
});

interface StagedBook {
  book_id: string;
  collection_no: number;
  title: string;
  access_type: string;
  due_date: string;
}

function IssueBook() {
  const qc = useQueryClient();
  const [issueDate, setIssueDate] = useState(todayISO());
  const [memberId, setMemberId] = useState("");
  const [bookId, setBookId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [staged, setStaged] = useState<StagedBook[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [issuing, setIssuing] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("*").maybeSingle();
      return data;
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("members")
        .select("id,member_no,name")
        .order("name");
      return data ?? [];
    },
  });

  const { data: books = [] } = useQuery({
    queryKey: ["books-available"],
    queryFn: async () => {
      const { data } = await supabase
        .from("books")
        .select("id,collection_no,title,access_type,available_copies")
        .eq("is_deleted", false)
        .gt("available_copies", 0)
        .order("title");
      return data ?? [];
    },
  });

  useEffect(() => {
    const days = settings?.default_issue_days ?? 14;
    setDueDate(addDays(issueDate, days));
  }, [settings, issueDate]);

  const memberError = validators.required(memberId, "Member");
  const issueDateError = validators.required(issueDate, "Issue Date");

  const addBook = () => {
    setTouched((t) => ({ ...t, bookId: true, dueDate: true }));
    if (!bookId) return toast.error("Please select a book.");
    if (!dueDate) return toast.error("Please select a due date.");
    if (dueDate < issueDate) return toast.error("Due date cannot be before issue date.");
    if (staged.some((s) => s.book_id === bookId))
      return toast.error("Book already added.");
    const b = books.find((x) => x.id === bookId);
    if (!b) return;
    if (b.access_type === "Reference Only")
      return toast.error("Reference-only books cannot be issued.");
    setStaged((s) => [
      ...s,
      {
        book_id: b.id,
        collection_no: b.collection_no,
        title: b.title,
        access_type: b.access_type ?? "Issuable",
        due_date: dueDate,
      },
    ]);
    setBookId("");
  };

  const issueAll = async () => {
    setTouched({ memberId: true, issueDate: true });
    if (memberError) return toast.error(memberError);
    if (issueDateError) return toast.error(issueDateError);
    if (staged.length === 0) return toast.error("Add at least one book.");
    if (issuing) return;
    setIssuing(true);
    try {
      const rows = staged.map((s) => ({
        member_id: memberId,
        book_id: s.book_id,
        issue_date: issueDate,
        due_date: s.due_date,
        status: "issued" as const,
      }));
      const { error } = await supabase.from("book_issues").insert(rows);
      if (error) throw error;
      for (const s of staged) {
        const b = books.find((x) => x.id === s.book_id);
        if (b) {
          await supabase
            .from("books")
            .update({ available_copies: Math.max(0, b.available_copies - 1) })
            .eq("id", s.book_id);
        }
      }
      const member = members.find((m) => m.id === memberId);
      logActivity("Issue books", `${staged.length} book(s) to ${member?.name}`);
      toast.success(`${staged.length} book(s) issued successfully`);
      setStaged([]);
      setMemberId("");
      setTouched({});
      qc.invalidateQueries({ queryKey: ["books-available"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to issue books");
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Issue Book"
        description="Issue books to a member with automatic due dates"
        icon={<ArrowUpRight className="h-6 w-6 text-primary" />}
      />

      <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]" onKeyDown={handleFormKeyDown as never}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Issue Date" required error={touched.issueDate ? issueDateError : null}>
            <Input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, issueDate: true }))}
            />
          </FormField>
          <FormField label="Member" required error={touched.memberId ? memberError : null}>
            <Select
              value={memberId || undefined}
              onValueChange={(v) => {
                setMemberId(v);
                setTouched((t) => ({ ...t, memberId: true }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {members.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    No members yet.
                  </div>
                ) : (
                  members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      #{m.member_no} — {m.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <div className="mt-5 border-t pt-5">
          <p className="mb-3 text-sm font-semibold">Add Books</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]">
            <FormField label="Book" required error={touched.bookId && !bookId ? "Please select a book." : null}>
              <Select value={bookId || undefined} onValueChange={setBookId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select book" />
                </SelectTrigger>
                <SelectContent>
                  {books.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No available books.
                    </div>
                  ) : (
                    books.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        #{b.collection_no} — {b.title} ({b.available_copies} avail)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Due Date" required>
              <Input
                type="date"
                value={dueDate}
                min={issueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </FormField>
            <div className="flex items-end">
              <Button type="button" onClick={addBook} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Coll. No</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Access Type</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No books added yet.
                  </TableCell>
                </TableRow>
              ) : (
                staged.map((s) => (
                  <TableRow key={s.book_id}>
                    <TableCell>{s.collection_no}</TableCell>
                    <TableCell className="font-medium">{s.title}</TableCell>
                    <TableCell>{s.access_type}</TableCell>
                    <TableCell>{fmtDate(issueDate)}</TableCell>
                    <TableCell>{fmtDate(s.due_date)}</TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => setStaged((arr) => arr.filter((x) => x.book_id !== s.book_id))}
                        aria-label="Remove"
                        className="text-destructive hover:opacity-70"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={issueAll} disabled={issuing || staged.length === 0 || !!memberError}>
            {issuing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BookCheck className="mr-2 h-4 w-4" />
            )}
            Issue
          </Button>
        </div>
      </div>
    </div>
  );
}
