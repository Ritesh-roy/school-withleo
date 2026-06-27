import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Save,
  RotateCcw,
  Pencil,
  Trash2,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMasters } from "@/lib/use-masters";
import { PageHeader } from "@/components/library/PageHeader";
import { DataTable, type Column } from "@/components/library/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { currency, logActivity, todayISO } from "@/lib/helpers";
import { exportToExcel, exportToPdf } from "@/lib/exports";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/books")({
  head: () => ({ meta: [{ title: "Book Master — Smart School ERP" }] }),
  component: BookMaster,
});

interface BookRow {
  id: string;
  collection_no: number;
  collection_name: string | null;
  title: string;
  isbn: string | null;
  author: string | null;
  editor: string | null;
  edition: string | null;
  volume: string | null;
  category: string | null;
  access_type: string | null;
  language: string | null;
  publisher: string | null;
  publishing_year: string | null;
  place: string | null;
  subject: string | null;
  location: string | null;
  status: string | null;
  no_of_pages: number | null;
  no_of_copies: number;
  available_copies: number;
  price: number | null;
  mrp: number | null;
  content: string | null;
  cover_image: string | null;
  purchase_date: string | null;
}

const empty = {
  title: "",
  collection_name: "",
  isbn: "",
  author: "",
  editor: "",
  edition: "",
  volume: "",
  category: "",
  access_type: "Issuable",
  language: "",
  publisher: "",
  publishing_year: "",
  place: "",
  subject: "",
  location: "",
  status: "",
  no_of_pages: "0",
  no_of_copies: "1",
  price: "0",
  mrp: "0",
  content: "",
  cover_image: "",
  purchase_date: todayISO(),
};

// Defined OUTSIDE the component so React preserves identity across renders.
// (Previously these were declared inside BookMaster, which caused every input
// to unmount/remount on each keystroke — destroying focus mid-typing.)
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Dropdown({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((n) => (
          <SelectItem key={n} value={n}>
            {n}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Enter key moves focus to the next focusable form control (skips textarea).
function handleFormKeyDown(e: KeyboardEvent<HTMLFormElement>) {
  if (e.key !== "Enter") return;
  const target = e.target as HTMLElement;
  if (target.tagName === "TEXTAREA") return;
  if (target.tagName === "BUTTON" && (target as HTMLButtonElement).type === "submit") return;
  e.preventDefault();
  const form = e.currentTarget;
  const focusables = Array.from(
    form.querySelectorAll<HTMLElement>(
      'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [role="combobox"]:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null);
  const idx = focusables.indexOf(target);
  const next = focusables[idx + 1];
  if (next) next.focus();
}

function BookMaster() {
  const qc = useQueryClient();
  const { data: masters = {} } = useMasters();
  const [form, setForm] = useState({ ...empty });
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const set = (k: keyof typeof empty, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const { data: books = [] } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("is_deleted", false)
        .order("collection_no", { ascending: false });
      if (error) throw error;
      return data as BookRow[];
    },
  });

  const reset = () => {
    setForm({ ...empty });
    setEditId(null);
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("Book title is required");
    const copies = parseInt(form.no_of_copies) || 1;
    const payload = {
      title: form.title.trim(),
      collection_name: form.collection_name || null,
      isbn: form.isbn || null,
      author: form.author || null,
      editor: form.editor || null,
      edition: form.edition || null,
      volume: form.volume || null,
      category: form.category || null,
      access_type: form.access_type || null,
      language: form.language || null,
      publisher: form.publisher || null,
      publishing_year: form.publishing_year || null,
      place: form.place || null,
      subject: form.subject || null,
      location: form.location || null,
      status: form.status || null,
      no_of_pages: parseInt(form.no_of_pages) || 0,
      no_of_copies: copies,
      price: parseFloat(form.price) || 0,
      mrp: parseFloat(form.mrp) || 0,
      content: form.content || null,
      cover_image: form.cover_image || null,
      purchase_date: form.purchase_date || null,
    };
    if (editId) {
      const { error } = await supabase.from("books").update(payload).eq("id", editId);
      if (error) return toast.error(error.message);
      toast.success("Book updated");
      logActivity("Update book", form.title);
    } else {
      const { error } = await supabase
        .from("books")
        .insert({ ...payload, available_copies: copies });
      if (error) return toast.error(error.message);
      toast.success("Book added");
      logActivity("Add book", form.title);
    }
    reset();
    qc.invalidateQueries({ queryKey: ["books"] });
  };

  const edit = (b: BookRow) => {
    setEditId(b.id);
    setForm({
      title: b.title,
      collection_name: b.collection_name ?? "",
      isbn: b.isbn ?? "",
      author: b.author ?? "",
      editor: b.editor ?? "",
      edition: b.edition ?? "",
      volume: b.volume ?? "",
      category: b.category ?? "",
      access_type: b.access_type ?? "Issuable",
      language: b.language ?? "",
      publisher: b.publisher ?? "",
      publishing_year: b.publishing_year ?? "",
      place: b.place ?? "",
      subject: b.subject ?? "",
      location: b.location ?? "",
      status: b.status ?? "",
      no_of_pages: String(b.no_of_pages ?? 0),
      no_of_copies: String(b.no_of_copies),
      price: String(b.price ?? 0),
      mrp: String(b.mrp ?? 0),
      content: b.content ?? "",
      cover_image: b.cover_image ?? "",
      purchase_date: b.purchase_date ?? todayISO(),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase
      .from("books")
      .update({ is_deleted: true })
      .eq("id", deleteId);
    setDeleteId(null);
    if (error) return toast.error(error.message);
    toast.success("Book deleted");
    qc.invalidateQueries({ queryKey: ["books"] });
  };

  const exportRows = books.map((b) => ({
    collection_no: b.collection_no,
    title: b.title,
    isbn: b.isbn,
    author: b.author,
    category: b.category,
    publisher: b.publisher,
    copies: b.no_of_copies,
    available: b.available_copies,
    price: b.price,
  }));
  const exportCols = [
    { header: "Coll. No", key: "collection_no" },
    { header: "Title", key: "title" },
    { header: "ISBN", key: "isbn" },
    { header: "Author", key: "author" },
    { header: "Category", key: "category" },
    { header: "Publisher", key: "publisher" },
    { header: "Copies", key: "copies" },
    { header: "Available", key: "available" },
    { header: "Price", key: "price" },
  ];

  const columns: Column<BookRow>[] = [
    {
      header: "Coll. No",
      cell: (b) => b.collection_no,
      searchValue: (b) => String(b.collection_no),
    },
    {
      header: "Title",
      cell: (b) => <span className="font-medium">{b.title}</span>,
      searchValue: (b) => b.title,
    },
    { header: "ISBN", cell: (b) => b.isbn || "-", searchValue: (b) => b.isbn ?? "" },
    { header: "Author", cell: (b) => b.author || "-", searchValue: (b) => b.author ?? "" },
    { header: "Category", cell: (b) => b.category || "-", searchValue: (b) => b.category ?? "" },
    {
      header: "Copies",
      cell: (b) => (
        <span>
          {b.available_copies}/{b.no_of_copies}
        </span>
      ),
    },
    { header: "Price", cell: (b) => currency(b.price) },
    {
      header: "Action",
      className: "text-right",
      cell: (b) => (
        <div className="text-right">
          <button onClick={() => edit(b)} className="mr-2 text-primary hover:opacity-70">
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteId(b.id)}
            className="text-destructive hover:opacity-70"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  // Field & Dropdown are defined at module scope (above) — DO NOT redeclare here.

  return (
    <div>
      <PageHeader
        title="Library Materials Entry"
        description="Add and manage your book catalogue"
        icon={<BookOpen className="h-6 w-6 text-primary" />}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => exportToExcel("Books", exportCols, exportRows)}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => exportToPdf("Book Catalogue", exportCols, exportRows)}
            >
              <FileText className="mr-2 h-4 w-4" /> PDF
            </Button>
          </>
        }
      />

      <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Collection / Purchase Date">
            <Input
              type="date"
              value={form.purchase_date}
              onChange={(e) => set("purchase_date", e.target.value)}
            />
          </Field>
          <Field label="Book Type">
            <Dropdown masterKey="book_type" value={form.collection_name} onChange={(v) => set("collection_name", v)} placeholder="Book Type" />
          </Field>
          <Field label="ISBN No">
            <Input value={form.isbn} onChange={(e) => set("isbn", e.target.value)} />
          </Field>
          <Field label="Title *">
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="Author">
            <Input value={form.author} onChange={(e) => set("author", e.target.value)} />
          </Field>
          <Field label="Editor">
            <Input value={form.editor} onChange={(e) => set("editor", e.target.value)} />
          </Field>
          <Field label="Edition">
            <Input value={form.edition} onChange={(e) => set("edition", e.target.value)} />
          </Field>
          <Field label="Volume">
            <Input value={form.volume} onChange={(e) => set("volume", e.target.value)} />
          </Field>
          <Field label="Category">
            <Dropdown masterKey="category" value={form.category} onChange={(v) => set("category", v)} placeholder="Category" />
          </Field>
          <Field label="Access Type">
            <Dropdown masterKey="access_type" value={form.access_type} onChange={(v) => set("access_type", v)} placeholder="Access Type" />
          </Field>
          <Field label="Language">
            <Dropdown masterKey="language" value={form.language} onChange={(v) => set("language", v)} placeholder="Language" />
          </Field>
          <Field label="Publisher">
            <Input value={form.publisher} onChange={(e) => set("publisher", e.target.value)} />
          </Field>
          <Field label="Publishing Year">
            <Input value={form.publishing_year} onChange={(e) => set("publishing_year", e.target.value)} />
          </Field>
          <Field label="Place">
            <Input value={form.place} onChange={(e) => set("place", e.target.value)} />
          </Field>
          <Field label="Subject">
            <Dropdown masterKey="subject" value={form.subject} onChange={(v) => set("subject", v)} placeholder="Subject" />
          </Field>
          <Field label="Location">
            <Dropdown masterKey="location" value={form.location} onChange={(v) => set("location", v)} placeholder="Location" />
          </Field>
          <Field label="Status">
            <Dropdown masterKey="status" value={form.status} onChange={(v) => set("status", v)} placeholder="Status" />
          </Field>
          <Field label="No. of Pages">
            <Input type="number" value={form.no_of_pages} onChange={(e) => set("no_of_pages", e.target.value)} />
          </Field>
          <Field label="No. of Copies *">
            <Input type="number" value={form.no_of_copies} onChange={(e) => set("no_of_copies", e.target.value)} />
          </Field>
          <Field label="Price">
            <Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} />
          </Field>
          <Field label="MRP">
            <Input type="number" value={form.mrp} onChange={(e) => set("mrp", e.target.value)} />
          </Field>
          <Field label="Cover Image URL">
            <Input value={form.cover_image} onChange={(e) => set("cover_image", e.target.value)} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Content / Description">
            <Textarea value={form.content} onChange={(e) => set("content", e.target.value)} rows={2} />
          </Field>
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
        <DataTable
          columns={columns}
          data={books}
          searchPlaceholder="Search books by title, ISBN, author…"
          pageSize={10}
        />
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this book?</AlertDialogTitle>
            <AlertDialogDescription>
              The book will be removed from the catalogue.
            </AlertDialogDescription>
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