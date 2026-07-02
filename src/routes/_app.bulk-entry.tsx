import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Plus, Trash2, Loader2, Pencil, Eye, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMasters } from "@/lib/use-masters";
import { PageHeader } from "@/components/library/PageHeader";
import { DataTable, type Column } from "@/components/library/DataTable";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { logActivity, todayISO } from "@/lib/helpers";
import {
  handleFormKeyDown,
  restrict,
  sanitize,
  validators,
} from "@/lib/form-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/bulk-entry")({
  head: () => ({ meta: [{ title: "Bulk Entry — School withleo" }] }),
  component: BulkEntry,
});

interface BookRow {
  id: string;
  collection_no: number;
  collection_name: string | null;
  category: string | null;
  isbn: string | null;
  title: string;
  author: string | null;
  no_of_copies: number;
}

function normalizeIsbn(v: string | null | undefined) {
  return (v ?? "").replace(/[-\s]/g, "").trim().toLowerCase();
}

function BulkEntry() {
  const qc = useQueryClient();
  const { data: masters = {} } = useMasters();
  const [bookType, setBookType] = useState("");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [isbn, setIsbn] = useState("");
  const [author, setAuthor] = useState("");
  const [copies, setCopies] = useState("1");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewRow, setViewRow] = useState<BookRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const errors = useMemo(
    () => ({
      bookType: validators.required(bookType, "Book Type"),
      category: validators.required(category, "Category"),
      title: validators.required(title, "Book Title"),
      isbn: isbn ? validators.isbn(isbn) : null,
      copies:
        validators.required(copies, "Copies") ||
        validators.greaterThanZero(copies, "Copies"),
    }),
    [bookType, category, title, isbn, copies],
  );
  const isValid = Object.values(errors).every((v) => !v);
  const err = (k: keyof typeof errors) => (touched[k] ? errors[k] : null);
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));

  const { data: books = [] } = useQuery({
    queryKey: ["books-bulk"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("id,collection_no,collection_name,category,isbn,title,author,no_of_copies")
        .eq("is_deleted", false)
        .order("collection_no", { ascending: false });
      if (error) throw error;
      return data as BookRow[];
    },
  });

  const resetForm = () => {
    setBookType("");
    setCategory("");
    setTitle("");
    setIsbn("");
    setAuthor("");
    setCopies("1");
    setTouched({});
    setEditId(null);
  };

  const submit = async () => {
    setTouched({ bookType: true, category: true, title: true, isbn: true, copies: true });
    if (!isValid) return toast.error("Please fix the highlighted fields.");
    if (saving) return;

    // Unique-ISBN guard: prevents duplicate insertion / duplicate update.
    if (isbn.trim()) {
      const target = normalizeIsbn(isbn);
      const { data: existing, error: exErr } = await supabase
        .from("books")
        .select("id,isbn")
        .eq("is_deleted", false);
      if (exErr) return toast.error(exErr.message);
      const dup = (existing ?? []).find(
        (r) => normalizeIsbn(r.isbn) === target && r.id !== editId,
      );
      if (dup) return toast.error("ISBN already exists.");
    }

    setSaving(true);
    const c = parseInt(copies) || 1;
    const payload = {
      title: title.trim(),
      collection_name: bookType,
      category,
      isbn: isbn.trim() || null,
      author: author.trim() || null,
      no_of_copies: c,
    };
    try {
      if (editId) {
        const { error } = await supabase
          .from("books")
          .update(payload)
          .eq("id", editId);
        if (error) throw error;
        toast.success("Book updated successfully");
        logActivity("Bulk edit book", title);
      } else {
        const { error } = await supabase.from("books").insert({
          ...payload,
          available_copies: c,
          purchase_date: todayISO(),
        });
        if (error) throw error;
        toast.success("Book added successfully");
        logActivity("Bulk add book", title);
      }
      resetForm();
      qc.invalidateQueries({ queryKey: ["books-bulk"] });
      qc.invalidateQueries({ queryKey: ["books"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save book");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (b: BookRow) => {
    setEditId(b.id);
    setBookType(b.collection_name ?? "");
    setCategory(b.category ?? "");
    setTitle(b.title);
    setIsbn(b.isbn ?? "");
    setAuthor(b.author ?? "");
    setCopies(String(b.no_of_copies));
    setTouched({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("books").update({ is_deleted: true }).eq("id", deleteId);
    setDeleteId(null);
    if (error) return toast.error(error.message);
    toast.success("Book removed");
    qc.invalidateQueries({ queryKey: ["books-bulk"] });
    qc.invalidateQueries({ queryKey: ["books"] });
  };

  const columns: Column<BookRow>[] = [
    { header: "Coll. No", cell: (b) => b.collection_no, searchValue: (b) => String(b.collection_no) },
    { header: "Book Type", cell: (b) => b.collection_name || "-" },
    { header: "ISBN", cell: (b) => b.isbn || "-", searchValue: (b) => b.isbn ?? "" },
    { header: "Title", cell: (b) => <span className="font-medium">{b.title}</span>, searchValue: (b) => b.title },
    { header: "Author", cell: (b) => b.author || "-", searchValue: (b) => b.author ?? "" },
    { header: "Copies", cell: (b) => b.no_of_copies },
    {
      header: "Action",
      className: "text-right",
      cell: (b) => (
        <div className="flex justify-end gap-2 text-right">
          <button
            onClick={() => setViewRow(b)}
            aria-label={`View ${b.title}`}
            className="text-muted-foreground hover:text-foreground"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => startEdit(b)}
            aria-label={`Edit ${b.title}`}
            className="text-primary hover:opacity-70"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteId(b.id)}
            aria-label={`Remove ${b.title}`}
            className="text-destructive hover:opacity-70"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Bulk Entry"
        description="Quickly add many books in succession"
        icon={<Boxes className="h-6 w-6 text-primary" />}
      />
      <form
        className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        onKeyDown={handleFormKeyDown}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Book Type" required error={err("bookType")}>
            <Select
              value={bookType || undefined}
              onValueChange={(v) => {
                setBookType(v);
                touch("bookType");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select book type" />
              </SelectTrigger>
              <SelectContent>
                {(masters["book_type"] ?? []).map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Category" required error={err("category")}>
            <Select
              value={category || undefined}
              onValueChange={(v) => {
                setCategory(v);
                touch("category");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {(masters["category"] ?? []).map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="ISBN" error={err("isbn")} hint="10 or 13 digits (hyphens allowed). Must be unique.">
            <Input
              placeholder="Enter ISBN number"
              inputMode="numeric"
              value={isbn}
              onKeyDown={restrict.isbn}
              onChange={(e) => setIsbn(sanitize.isbn(e.target.value).slice(0, 17))}
              onBlur={() => touch("isbn")}
            />
          </FormField>
          <FormField label="Title" required error={err("title")}>
            <Input
              placeholder="Enter book title"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => touch("title")}
            />
          </FormField>
          <FormField label="Author">
            <Input
              placeholder="Enter author name"
              value={author}
              maxLength={150}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </FormField>
          <FormField label="Copies" required error={err("copies")}>
            <Input
              placeholder="Enter number of copies"
              inputMode="numeric"
              value={copies}
              onKeyDown={restrict.digits}
              onChange={(e) => setCopies(sanitize.digits(e.target.value, 5))}
              onBlur={() => touch("copies")}
            />
          </FormField>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          {editId && (
            <Button type="button" variant="outline" onClick={resetForm}>
              <X className="mr-2 h-4 w-4" />
              Cancel Edit
            </Button>
          )}
          <Button type="submit" disabled={saving || !isValid}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : editId ? (
              <Save className="mr-2 h-4 w-4" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {editId ? "Update Book" : "Add Book"}
          </Button>
        </div>
      </form>

      <div className="mt-6">
        <DataTable columns={columns} data={books} searchPlaceholder="Search books…" />
      </div>

      {/* View dialog */}
      <Dialog open={!!viewRow} onOpenChange={(o) => !o && setViewRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewRow?.title}</DialogTitle>
            <DialogDescription>Book #{viewRow?.collection_no}</DialogDescription>
          </DialogHeader>
          {viewRow && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Book Type</dt>
              <dd>{viewRow.collection_name || "-"}</dd>
              <dt className="text-muted-foreground">Category</dt>
              <dd>{viewRow.category || "-"}</dd>
              <dt className="text-muted-foreground">ISBN</dt>
              <dd>{viewRow.isbn || "-"}</dd>
              <dt className="text-muted-foreground">Author</dt>
              <dd>{viewRow.author || "-"}</dd>
              <dt className="text-muted-foreground">Copies</dt>
              <dd>{viewRow.no_of_copies}</dd>
            </dl>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRow(null)}>
              Close
            </Button>
            {viewRow && (
              <Button
                onClick={() => {
                  const r = viewRow;
                  setViewRow(null);
                  startEdit(r);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove book?</AlertDialogTitle>
            <AlertDialogDescription>
              This action can be undone by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
